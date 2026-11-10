import { type AddonKey, loadEnabledAddons } from '@/platform/addons';
import { hasFeature } from '@/platform/billing/features';
import { trialShouldExpire } from '@/platform/billing/trial';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { auth, clerkClient, verifyToken } from '@clerk/nextjs/server';
import { DEFAULT_MOBILE_FEATURES } from '@ishflow/mobile-api-contract';
import type { ApiKeyScope, Membership, ScopeOperator, Tenant, User } from '@prisma/client';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import {
  handleOrganizationCreated,
  handleOrganizationMembershipCreated,
  handleUserCreated,
  syncMissingMembership,
} from './clerk-sync';
import { type MobileJWTClaims, verifyMobileJWT } from './mobile-jwt';
import { pickPrimaryRoleName } from './pick-primary-role';
import { ApiKeyAuthError, resolveApiKeyContext } from './resolve-api-key';

export type ScopeRule = {
  entityId: string;
  field: string;
  operator: ScopeOperator;
  value: unknown;
};

export type RoleScopeGroup = {
  roleId: string;
  rules: ScopeRule[];
};

export type AppContext = {
  user: User;
  tenant: Tenant | null;
  membership: Membership | null;
  permissions: Set<string>;
  scopesByEntity: Map<string, RoleScopeGroup[]>;
  addons: ReadonlySet<AddonKey>;
  viewAsRole?: string;
  impersonation?: { actorClerkId: string; tenantId: string };
  /**
   * Only populated when this context was minted from a `1ca_live_*` API key
   * bearer. Cookie / Clerk JWT / mobile JWT contexts leave it undefined.
   * Carries the row id (for audit attribution + cross-referencing in the MCP
   * dispatcher) and the resolved scope rank (for per-tool gating beyond what
   * `permissions` can express).
   */
  apiKey?: { id: string; scope: ApiKeyScope };
};

/**
 * Attach the tenant's enabled premium addons to the context. Called once
 * per resolveContext invocation as the last step (after impersonation
 * may have swapped the tenant). Tenant-less contexts always get an empty
 * Set.
 */
async function attachAddons(ctx: AppContext | null): Promise<AppContext | null> {
  if (!ctx) return ctx;
  if (!ctx.tenant) return { ...ctx, addons: EMPTY_ADDONS };
  const addons = await loadEnabledAddons(ctx.tenant.id);
  return { ...ctx, addons };
}

const EMPTY_ADDONS: ReadonlySet<AddonKey> = new Set();
export { EMPTY_ADDONS as EMPTY_ADDON_SET };

type RoleWithScopes = {
  id: string;
  permissions: string[];
  scopes: Array<{
    entityId: string;
    field: string;
    operator: ScopeOperator;
    value: unknown;
  }>;
};

type MembershipWithRoles = Membership & { roles: RoleWithScopes[] };

type MembershipWithRolesAndTenant = MembershipWithRoles & { tenant: Tenant };

type InitialLookup = {
  user: User | null;
  tenant: Tenant | null;
  membership: MembershipWithRoles | null;
};

const MEMBERSHIP_INCLUDE = {
  roles: { include: { scopes: true } },
} as const;

const MEMBERSHIP_INCLUDE_WITH_TENANT = {
  ...MEMBERSHIP_INCLUDE,
  tenant: true,
} as const;

function emptyPermissions(): {
  permissions: Set<string>;
  scopesByEntity: Map<string, RoleScopeGroup[]>;
} {
  return { permissions: new Set<string>(), scopesByEntity: new Map<string, RoleScopeGroup[]>() };
}

export function buildPermissionAndScopeData(roles: RoleWithScopes[]): {
  permissions: Set<string>;
  scopesByEntity: Map<string, RoleScopeGroup[]>;
} {
  const permissions = new Set<string>();
  const scopesByEntity = new Map<string, RoleScopeGroup[]>();

  for (const role of roles) {
    for (const p of role.permissions) permissions.add(p);

    const rulesByEntity = new Map<string, ScopeRule[]>();
    for (const s of role.scopes) {
      const list = rulesByEntity.get(s.entityId) ?? [];
      list.push({
        entityId: s.entityId,
        field: s.field,
        operator: s.operator,
        value: s.value,
      });
      rulesByEntity.set(s.entityId, list);
    }

    const entitiesTouched = new Set<string>();
    let hasWildcardEntity = false;
    for (const perm of role.permissions) {
      const entity = perm.split(':')[0];
      if (!entity) continue;
      if (entity === '*' || entity.endsWith('.*')) {
        hasWildcardEntity = true;
        continue;
      }
      entitiesTouched.add(entity);
    }
    for (const k of rulesByEntity.keys()) entitiesTouched.add(k);
    if (hasWildcardEntity) entitiesTouched.add('*');

    for (const entityId of entitiesTouched) {
      const rules = rulesByEntity.get(entityId) ?? [];
      const list = scopesByEntity.get(entityId) ?? [];
      list.push({ roleId: role.id, rules });
      scopesByEntity.set(entityId, list);
    }
  }

  return { permissions, scopesByEntity };
}

/**
 * Resolve the current user + tenant + membership.
 *
 * Bearer order (Authorization: Bearer ...):
 *   1. iOS HS256 mobile JWT (verifyMobileJWT) — token carries Clerk userId +
 *      internal tenantId. Strict membership guard: a JWT naming a tenant the
 *      user has no membership in is refused.
 *   2. Android Clerk JWT template (verifyToken via JWKS) — token carries
 *      Clerk sub + org_id. Resolves through the same Clerk-claims path the
 *      cookie session uses.
 *
 * Cookie session (Clerk web): used when no Authorization header is present.
 *
 * `opts.headers` is provided by tests (and by mobile API routes that already
 * have a `Request` in scope). When omitted, `next/headers` is used. Note that
 * passing a non-stable `opts` object disables `cache()` deduplication for
 * that call; mobile API routes already invoke `resolveContext` once per
 * request so this is fine in practice.
 */
export const resolveContext = cache(
  async (opts?: { headers?: Headers }): Promise<AppContext | null> => {
    // Local-dev auth bypass — when DEV_AUTH_BYPASS=1 in .env.local AND we're
    // not on production, skip Clerk entirely and return a fixed dev tenant.
    // Triple-guarded inside `isDevAuthBypassActive`. Never runs in prod.
    const { isDevAuthBypassActive, getOrCreateDevBypassContext } = await import('./dev-bypass');
    if (isDevAuthBypassActive()) {
      return getOrCreateDevBypassContext();
    }

    const headerBag = opts?.headers ?? (await headers());
    const authHeader = headerBag.get('authorization');

    let ctx: AppContext | null;
    if (authHeader && /^bearer /i.test(authHeader)) {
      const token = authHeader.slice('Bearer '.length).trim();
      if (!token) return null;

      // 1. iOS HS256 mobile JWT.
      const bearer = await resolveBearerContext(token);
      if (bearer) {
        ctx = bearer;
      } else {
        // 2. Android Clerk JWT template (JWKS).
        try {
          const claims = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
          });
          ctx = await resolveFromClerkClaims({
            userId: String(claims.sub),
            orgId: claims.org_id ? String(claims.org_id) : undefined,
          });
        } catch {
          return null;
        }
      }
    } else {
      // Cookie session path.
      const { userId, orgId } = await auth();
      if (!userId) return null;
      ctx = await resolveFromClerkClaims({
        userId: String(userId),
        orgId: orgId ?? undefined,
      });
    }

    const impersonated = await applySuperImpersonation(ctx, headerBag);
    return attachAddons(impersonated);
  },
);

/**
 * Super-admin impersonation override. When the middleware-injected
 * `x-super-impersonate` header is present AND the viewer is a platform admin,
 * swap `ctx.tenant` for the impersonated tenant and annotate `ctx.impersonation`.
 *
 * Mutations are already blocked at the middleware layer; this is purely the
 * read-side context swap. Returns the original ctx unchanged when no header
 * is set, the viewer is not a platform admin, or the impersonated tenant is
 * missing/archived.
 */
async function applySuperImpersonation(
  ctx: AppContext | null,
  headerBag: Headers,
): Promise<AppContext | null> {
  if (!ctx) return ctx;
  const impersonateTenantId = headerBag.get('x-super-impersonate');
  if (!impersonateTenantId) return ctx;

  const { isPlatformAdmin } = await import('./platform-admin');
  if (!isPlatformAdmin(ctx)) return ctx;

  const impersonatedTenant = await withBypass((tx) =>
    tx.tenant.findUnique({ where: { id: impersonateTenantId } }),
  );
  if (!impersonatedTenant || impersonatedTenant.deletedAt) return ctx;

  return {
    ...ctx,
    tenant: impersonatedTenant,
    impersonation: {
      actorClerkId: ctx.user.clerkId,
      tenantId: impersonateTenantId,
    },
  };
}

/**
 * Bearer dispatch. Three token families share `Authorization: Bearer <...>`:
 *
 *   1. `1ca_live_*` — Public API key. Routed to `resolveApiKeyBearer`, which
 *      bcrypt-verifies the key and enforces the `apiAccess` plan feature.
 *      Throws `ApiKeyAuthError` (402 `feature_locked`) on plan mismatch so
 *      the caller can surface it verbatim. Prefix detection avoids running
 *      bcrypt against short-lived Clerk JWTs.
 *   2. iOS HS256 mobile JWT (verifyMobileJWT) — token carries Clerk userId +
 *      internal tenantId. Strict membership guard: a JWT naming a tenant the
 *      user has no membership in is refused.
 *   3. Otherwise → `null`, caller falls through to the Clerk JWT / cookie
 *      path.
 *
 * JWT carries:
 *   - `userId`: Clerk user id (== `User.clerkId` in the local DB)
 *   - `tenantId`: internal `Tenant.id` (UUID), or `null` for tenant-less users
 *   - `scopes`: extra permission strings unioned into the AppContext
 */
async function resolveBearerContext(token: string): Promise<AppContext | null> {
  if (token.startsWith('1ca_live_')) {
    return resolveApiKeyBearer(token);
  }

  let claims: MobileJWTClaims;
  try {
    claims = await verifyMobileJWT(token);
  } catch {
    return null;
  }

  const initial = await withBypass(async (tx): Promise<InitialLookup> => {
    const user = await tx.user.findUnique({ where: { clerkId: claims.userId } });
    if (!user) return { user: null, tenant: null, membership: null };
    if (!claims.tenantId) return { user, tenant: null, membership: null };
    const tenant = await tx.tenant.findUnique({ where: { id: claims.tenantId } });
    if (!tenant) {
      return { user, tenant: null, membership: null };
    }
    if (tenant.deletedAt) {
      return { user, tenant, membership: null };
    }
    const membership = (await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      include: MEMBERSHIP_INCLUDE,
    })) as MembershipWithRoles | null;
    return { user, tenant, membership };
  });

  if (!initial.user) return null;

  // Defensive guard: a bearer JWT is only valid when the membership it
  // implies still exists. If the JWT names a tenant for which the user has
  // no membership row (revoked, stale token, malformed JWT), the bearer
  // path MUST refuse — otherwise it would mint authority for a (user,
  // tenant) pair that the membership table doesn't authorize. Caller falls
  // through to the Clerk path, which will independently re-verify.
  if (initial.tenant && !initial.membership) {
    return null;
  }

  const extra = claims.scopes;
  if (!claims.tenantId || !initial.tenant) {
    const empty = emptyPermissions();
    for (const p of extra) empty.permissions.add(p);
    return {
      user: initial.user,
      tenant: null,
      membership: null,
      permissions: empty.permissions,
      scopesByEntity: empty.scopesByEntity,
      addons: EMPTY_ADDONS,
    };
  }

  const roles = initial.membership?.roles ?? [];
  const { permissions, scopesByEntity } = buildPermissionAndScopeData(roles);
  // For a tenant-backed bearer, authority is the CURRENT membership — never the
  // perms baked into the (up to 30-day) JWT `scopes` at mint time. Unioning the
  // stale snapshot would let a demoted user keep elevated perms until the token
  // expires. The `extra` union is kept only on the tenant-less branch above,
  // where there is no membership to derive authority from. Finding A1.

  return {
    user: initial.user,
    tenant: initial.tenant,
    membership: initial.membership,
    permissions,
    scopesByEntity,
    addons: EMPTY_ADDONS,
  };
}

/**
 * Public API key bearer path. Delegates to `resolveApiKeyContext` for the
 * bcrypt match + AppContext build, then enforces the `apiAccess` plan
 * feature. Tenants whose effective plan lacks `apiAccess` get a typed throw
 * (HTTP 402 `feature_locked`) which the `/api/v1/*` route handlers convert
 * to a JSON error response — the throw MUST propagate; the bearer dispatch
 * never catches it.
 *
 * Returns `null` (auth failed silently) only when the key itself is invalid
 * (bad format, no candidate, bcrypt mismatch, or — defensively — a resolver
 * that somehow produced a tenant-less context).
 */
async function resolveApiKeyBearer(token: string): Promise<AppContext | null> {
  const ctx = await resolveApiKeyContext(token);
  if (!ctx) return null;
  // API keys always carry a tenant; a null here would be a resolver bug.
  // Treat as locked rather than minting tenant-less authority.
  if (!ctx.tenant) {
    throw new ApiKeyAuthError(402, 'feature_locked', 'API access requires Business plan or higher');
  }
  // `platform_admin` keys administer the whole platform (super-admin tools,
  // cross-tenant subscription/support ops). Their access MUST NOT depend on
  // the key-owner tenant's billing plan — the platform operator is not a
  // customer consuming the per-tenant `apiAccess` paid feature. Only
  // tenant-scoped read/write keys are gated by `apiAccess` (Business+).
  if (ctx.apiKey?.scope !== 'platform_admin' && !hasFeature(ctx.tenant, 'apiAccess')) {
    throw new ApiKeyAuthError(402, 'feature_locked', 'API access requires Business plan or higher');
  }
  return ctx;
}

export async function resolveFromClerkClaims({
  userId,
  orgId,
}: {
  userId: string;
  orgId?: string;
}): Promise<AppContext | null> {
  // Mobile clients (Android, iOS browser flow) never call Clerk's
  // setActive({ organization }), so the JWT's `org_id` claim stays null even
  // after the user switches tenant via /api/mobile/tenant/switch. The switch
  // endpoint persists the chosen tenant on Clerk publicMetadata.activeTenantId;
  // honour that here so subsequent /me + every other authenticated call
  // resolve to the freshly-selected tenant without needing a JWT refresh.
  let activeTenantIdFromMetadata: string | undefined;
  if (!orgId) {
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      const candidate = (clerkUser.publicMetadata as Record<string, unknown> | null)
        ?.activeTenantId;
      if (typeof candidate === 'string' && candidate.length > 0) {
        activeTenantIdFromMetadata = candidate;
      }
    } catch {
      // Clerk lookup failed; fall through to oldest-membership fallback.
    }
  }

  const initial = await withBypass(async (tx): Promise<InitialLookup> => {
    const user = await tx.user.findUnique({ where: { clerkId: userId } });
    if (!user) return { user: null, tenant: null, membership: null };
    if (!orgId) {
      if (activeTenantIdFromMetadata) {
        const tenant = await tx.tenant.findFirst({
          where: { id: activeTenantIdFromMetadata, deletedAt: null },
        });
        if (tenant) {
          const membership = (await tx.membership.findUnique({
            where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
            include: MEMBERSHIP_INCLUDE,
          })) as MembershipWithRoles | null;
          if (membership) {
            return { user, tenant, membership };
          }
        }
        // activeTenantId pointed at a tenant the user no longer belongs to
        // (or was deleted) — fall through to oldest-membership below.
      }
      // Clerk session has no active organization and no usable metadata hint.
      // Common on mobile clients on first sign-in. Fall back to the user's
      // memberships table and auto-pick the OLDEST one (their own org or
      // first joined). The caller (iOS) is responsible for offering an
      // explicit picker so the user can switch — matching web's
      // OrganizationSwitcher UX.
      const memberships = (await tx.membership.findMany({
        where: { userId: user.id, tenant: { deletedAt: null } },
        include: MEMBERSHIP_INCLUDE_WITH_TENANT,
        orderBy: { createdAt: 'asc' },
        take: 1,
      })) as MembershipWithRolesAndTenant[];
      const first = memberships[0];
      if (first) {
        const { tenant, ...membershipFields } = first;
        return { user, tenant, membership: membershipFields as MembershipWithRoles };
      }
      return { user, tenant: null, membership: null };
    }
    // `orgId` here is the JWT's `org_id` claim. Standard Clerk JWTs put the
    // Clerk org id (`org_xxx`) here, but custom JWT templates that map
    // `{{user.public_metadata.activeTenantId}}` into this claim ship a DB UUID
    // instead. Accept both formats so the resolver works for either template.
    // Tenant.id is a UUID column — Prisma throws P2023 (invalid UUID) if we
    // include `{ id: orgId }` for a non-UUID string like `org_xxx`. Gate the
    // id branch behind a UUID shape check.
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orgId,
    );
    const tenant = looksLikeUuid
      ? await tx.tenant.findFirst({
          where: { OR: [{ clerkOrgId: orgId }, { id: orgId }] },
        })
      : await tx.tenant.findFirst({ where: { clerkOrgId: orgId } });
    if (!tenant) {
      return { user, tenant: null, membership: null };
    }
    if (tenant.deletedAt) {
      return { user, tenant, membership: null };
    }
    const membership = (await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      include: MEMBERSHIP_INCLUDE,
    })) as MembershipWithRoles | null;
    return { user, tenant, membership };
  });

  if (initial.user && initial.tenant && initial.membership) {
    const { permissions, scopesByEntity } = buildPermissionAndScopeData(initial.membership.roles);
    return {
      user: initial.user,
      tenant: initial.tenant,
      membership: initial.membership,
      permissions,
      scopesByEntity,
      addons: EMPTY_ADDONS,
    };
  }

  if (initial.user && !orgId) {
    // Fallback already searched memberships above. If 0 memberships in DB,
    // attempt a one-time on-demand Clerk → DB org/membership sync (covers
    // missed webhooks, wiped DBs, and pre-existing users that signed in
    // before this code path shipped). After sync, re-query memberships and
    // apply the same auto-pick rule (1 → attach, 0 or 2+ → null tenant).
    const refetched = await syncAndRefetchOrgLessMembership(userId, initial.user);
    if (refetched) return refetched;
    return {
      user: initial.user,
      tenant: null,
      membership: null,
      addons: EMPTY_ADDONS,
      ...emptyPermissions(),
    };
  }

  // orgId is present but the active org has no resolvable tenant in our DB yet.
  // Clerk's session org-claim is eventually consistent: right after signup the
  // first /dashboard render can run before the org→tenant link is visible, so
  // resolution yields an empty context and the sidebar renders blank until a
  // manual refresh. The membership table is authoritative and already committed
  // by onboarding, so when the user has exactly one active membership, resolve
  // it deterministically — mirrors the orgId-less fallback above. Gated on a
  // missing tenant only (a present tenant with no membership is an invite that
  // syncAndResolve must handle), and on a single membership (multi-org users
  // can't be auto-disambiguated → fall through to sync).
  if (initial.user && !initial.tenant) {
    const user = initial.user;
    const sole = await withBypass(async (tx) => {
      const memberships = (await tx.membership.findMany({
        where: { userId: user.id, tenant: { deletedAt: null } },
        include: MEMBERSHIP_INCLUDE_WITH_TENANT,
        orderBy: { createdAt: 'asc' },
        take: 2,
      })) as MembershipWithRolesAndTenant[];
      return memberships.length === 1 ? memberships[0] : null;
    });
    if (sole) {
      const { tenant, ...membershipFields } = sole;
      const membership = membershipFields as MembershipWithRoles;
      const { permissions, scopesByEntity } = buildPermissionAndScopeData(membership.roles);
      return { user, tenant, membership, permissions, scopesByEntity, addons: EMPTY_ADDONS };
    }
  }

  return syncAndResolve(userId, orgId, initial);
}

/**
 * Sync the Clerk user's organization memberships into our DB, then re-query
 * the user's memberships from the DB and apply the same orgId-less auto-pick
 * rule (1 active membership → attach as ctx, otherwise null tenant). Returns
 * `null` when sync produces 0 or 2+ active memberships so the caller falls
 * back to the empty-tenant context. Used only on the orgId-less code path
 * (mobile sign-in via ASWebAuthenticationSession never sets active org).
 */
async function syncAndRefetchOrgLessMembership(
  clerkUserId: string,
  user: User,
): Promise<AppContext | null> {
  // Only sync from Clerk when DB has 0 active memberships. A user with 2+
  // active memberships needs to explicitly pick — pulling more rows from
  // Clerk can't disambiguate.
  const existingCount = await withBypass(async (tx) =>
    tx.membership.count({
      where: { userId: user.id, tenant: { deletedAt: null } },
    }),
  );
  if (existingCount > 0) return null;

  const clerk = await clerkClient();
  const list = await clerk.users.getOrganizationMembershipList({ userId: clerkUserId });
  if (list.data.length === 0) return null;

  for (const m of list.data) {
    const org = m.organization;
    await handleOrganizationCreated({
      id: org.id,
      name: org.name,
      slug: org.slug ?? `${org.id.slice(4, 12)}`,
    });
    await handleOrganizationMembershipCreated({
      organization: { id: org.id },
      // Pass the email identifier so the invited `systemRole` lookup runs.
      public_user_data: {
        user_id: clerkUserId,
        identifier: m.publicUserData?.identifier ?? undefined,
      },
      role: m.role,
    });
  }

  return withBypass(async (tx) => {
    const memberships = (await tx.membership.findMany({
      where: { userId: user.id, tenant: { deletedAt: null } },
      include: MEMBERSHIP_INCLUDE_WITH_TENANT,
      orderBy: { createdAt: 'asc' },
      take: 1,
    })) as MembershipWithRolesAndTenant[];
    const first = memberships[0];
    if (!first) return null;
    const { tenant, ...membershipFields } = first;
    const membership = membershipFields as MembershipWithRoles;
    const { permissions, scopesByEntity } = buildPermissionAndScopeData(membership.roles);
    return { user, tenant, membership, permissions, scopesByEntity, addons: EMPTY_ADDONS };
  });
}

async function syncAndResolve(
  userId: string,
  orgId: string | null | undefined,
  initial: InitialLookup,
): Promise<AppContext | null> {
  let user = initial.user;

  if (!user) {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    await handleUserCreated({
      id: clerkUser.id,
      email_addresses: clerkUser.emailAddresses.map((e) => ({ email_address: e.emailAddress })),
      first_name: clerkUser.firstName,
      last_name: clerkUser.lastName,
      image_url: clerkUser.imageUrl,
    });
    user = await findUserByClerkId(userId);
  }

  if (!user) return null;

  if (!orgId) {
    return {
      user,
      tenant: null,
      membership: null,
      addons: EMPTY_ADDONS,
      ...emptyPermissions(),
    };
  }

  let tenant = initial.tenant;

  if (!tenant) {
    // orgId may be a Clerk org id (`org_xxx`) OR a DB UUID when the JWT
    // template maps `public_metadata.activeTenantId` into `org_id`. UUIDs are
    // already DB-resolvable via initial lookup; if we get here without a
    // tenant for a UUID-shaped orgId, the row simply doesn't exist anymore
    // (deleted or mis-keyed) — no Clerk org to sync, so bail.
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orgId,
    );
    if (looksLikeUuid) {
      tenant = await withBypass((tx) => tx.tenant.findUnique({ where: { id: orgId } }));
    } else {
      const clerk = await clerkClient();
      const clerkOrg = await clerk.organizations.getOrganization({ organizationId: orgId });
      await handleOrganizationCreated({
        id: clerkOrg.id,
        name: clerkOrg.name,
        slug: clerkOrg.slug ?? `${clerkOrg.id.slice(4, 12)}`,
      });
      tenant = await findTenantByClerkOrgId(orgId);
    }
  }

  if (!tenant || tenant.deletedAt) {
    return {
      user,
      tenant: null,
      membership: null,
      addons: EMPTY_ADDONS,
      ...emptyPermissions(),
    };
  }

  let membership = initial.membership ?? (await findMembershipWithRoles(tenant.id, user.id));

  if (!membership) {
    const clerk = await clerkClient();
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });
    const m = memberships.data.find((x) => x.publicUserData?.userId === userId);
    if (m) {
      await handleOrganizationMembershipCreated({
        organization: { id: orgId },
        // Pass the email identifier so the invited `systemRole` lookup runs.
        // Without it, on-demand sync defaults every invitee to `viewer`.
        public_user_data: {
          user_id: userId,
          identifier: m.publicUserData?.identifier ?? undefined,
        },
        role: m.role,
      });
      membership = await findMembershipWithRoles(tenant.id, user.id);
    }
  }

  if (!membership) {
    return {
      user,
      tenant,
      membership: null,
      addons: EMPTY_ADDONS,
      ...emptyPermissions(),
    };
  }

  let { permissions, scopesByEntity } = buildPermissionAndScopeData(membership.roles);

  // View-as-role: owner/admin can impersonate another role read-only
  const viewAsCookie = (await cookies()).get('view-as-role')?.value;
  if (viewAsCookie && permissions.has('*:*')) {
    const { verifyViewAsCookie } = await import('./view-as-role');
    const secret = process.env.MOBILE_JWT_SECRET;
    if (secret) {
      const role = verifyViewAsCookie(viewAsCookie, secret);
      if (role) {
        // Strip all write/post/unpost/delete permissions → read-only impersonation
        const stripped = new Set<string>();
        for (const p of permissions) {
          if (
            !p.includes(':write') &&
            !p.includes(':post') &&
            !p.includes(':unpost') &&
            !p.includes(':delete')
          ) {
            stripped.add(p);
          }
        }
        permissions = stripped;
        return {
          user,
          tenant,
          membership,
          permissions,
          scopesByEntity,
          addons: EMPTY_ADDONS,
          viewAsRole: role,
        };
      }
    }
  }

  return { user, tenant, membership, permissions, scopesByEntity, addons: EMPTY_ADDONS };
}

export async function requireContext(): Promise<AppContext> {
  const ctx = await resolveContext();
  if (!ctx) throw new Error('UNAUTHENTICATED');
  return ctx;
}

export async function requireTenantContext(): Promise<
  AppContext & { tenant: Tenant; membership: Membership }
> {
  const ctx = await requireContext();
  if (!ctx.tenant || !ctx.membership) throw new Error('NO_TENANT_SELECTED');
  // Lazily clear a lapsed trial flag so the billing UI stops showing
  // "trialing" once the window closes. effectivePlan already drops the
  // entitlement to the stored plan at expiry — this only tidies status.
  // Idempotent: fires at most once per tenant (next read is `active`).
  if (trialShouldExpire(ctx.tenant)) {
    const tenantId = ctx.tenant.id;
    await withBypass((tx) =>
      tx.tenant.update({ where: { id: tenantId }, data: { status: 'active' } }),
    );
    ctx.tenant.status = 'active';
  }
  return { ...ctx, tenant: ctx.tenant, membership: ctx.membership };
}

export function toMeResponse(ctx: AppContext) {
  return {
    user: {
      id: ctx.user.id,
      email: ctx.user.email,
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
      imageUrl: ctx.user.imageUrl,
    },
    tenant: ctx.tenant
      ? {
          id: ctx.tenant.id,
          slug: ctx.tenant.slug,
          name: ctx.tenant.name,
          currency: ctx.tenant.currency ?? 'USD',
          mobileFeatures: {
            ...DEFAULT_MOBILE_FEATURES,
            ...((ctx.tenant as unknown as { mobileFeatures?: Record<string, boolean> })
              .mobileFeatures ?? {}),
          },
        }
      : null,
    permissions: [...ctx.permissions],
  };
}

export type MembershipSummary = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  primaryRole: string;
  isCurrent: boolean;
};

/**
 * Returns ALL active memberships for the given user, with role + tenant
 * metadata. Used by `/api/mobile/me` to power the mobile organization
 * switcher. `currentTenantId` flags whichever membership matches the active
 * AppContext so the client can highlight the selected row without an extra
 * comparison step.
 *
 * Always re-syncs the user's Clerk organization memberships into our DB
 * before listing — covers the no-webhook prod setup where new orgs/invites
 * only land in our DB on the next `/me` call. The sync is opportunistic
 * (failures are swallowed) and uses `syncMissingMembership` so existing
 * membership roles set via web `/admin/members` are NEVER overwritten.
 */
export async function listMembershipsForUser(
  clerkUserId: string,
  userId: string,
  currentTenantId: string | null,
): Promise<MembershipSummary[]> {
  try {
    const clerk = await clerkClient();
    const list = await clerk.users.getOrganizationMembershipList({ userId: clerkUserId });
    for (const m of list.data) {
      const org = m.organization;
      await handleOrganizationCreated({
        id: org.id,
        name: org.name,
        slug: org.slug ?? `${org.id.slice(4, 12)}`,
      });
      await syncMissingMembership({
        organization: { id: org.id },
        public_user_data: { user_id: clerkUserId },
        role: m.role,
      });
    }
  } catch {
    // Sync is best-effort; fall through to whatever the DB currently knows.
  }

  return withBypass(async (tx) => {
    const rows = await tx.membership.findMany({
      where: { userId, tenant: { deletedAt: null } },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        roles: { select: { name: true, isSystem: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((m) => ({
      tenantId: m.tenant.id,
      tenantName: m.tenant.name,
      tenantSlug: m.tenant.slug,
      primaryRole: pickPrimaryRoleName(m.roles.map((r) => ({ name: r.name }))),
      isCurrent: currentTenantId === m.tenant.id,
    }));
  });
}

function findUserByClerkId(clerkId: string) {
  return withBypass((tx) => tx.user.findUnique({ where: { clerkId } }));
}

function findTenantByClerkOrgId(clerkOrgId: string) {
  return withBypass((tx) => tx.tenant.findUnique({ where: { clerkOrgId } }));
}

function findMembershipWithRoles(
  tenantId: string,
  userId: string,
): Promise<MembershipWithRoles | null> {
  return withBypass(
    async (tx) =>
      (await tx.membership.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
        include: MEMBERSHIP_INCLUDE,
      })) as MembershipWithRoles | null,
  );
}

// Re-export prisma for any external consumers who import from this module.
export { prisma };

// Re-export ApiKeyAuthError so /api/v1/* route handlers can import the auth
// error type alongside resolveContext from a single module.
export { ApiKeyAuthError } from './resolve-api-key';
