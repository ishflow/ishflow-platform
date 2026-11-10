// Local-dev auth bypass. Skips Clerk session checks and returns a fixed
// AppContext so localhost iteration doesn't require logging in. Active only
// when ALL of the following hold:
//   - process.env.NODE_ENV !== 'production'
//   - process.env.DEV_AUTH_BYPASS === '1'
// The first guard cannot be set by .env at build time on Vercel — Next.js
// hardcodes `NODE_ENV=production` for `next build`/`next start`. The second
// is opt-in and lives ONLY in .env.local (never in .env.production*).
//
// Hardcoded stable UUIDs let the dev tenant survive DB resets without
// re-seeding the rest of the demo data.

import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { cookies, headers } from 'next/headers';
import type { AppContext } from './current-context';
import { EMPTY_ADDON_SET, buildPermissionAndScopeData } from './current-context';
import { seedSystemRoles } from './seed-system-roles';

export const DEV_BYPASS_TENANT_ID = '00000000-0000-0000-0000-000000d3b001';
export const DEV_BYPASS_TENANT_COOKIE = 'dev_bypass_tenant_id';
export const DEV_BYPASS_USER_COOKIE = 'dev_bypass_user_id';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readOverride(headerName: string, cookieName: string): Promise<string | null> {
  try {
    const h = await headers();
    const headerVal = h.get(headerName);
    if (headerVal && UUID_RE.test(headerVal)) return headerVal;
  } catch {
    // headers() throws outside request scope.
  }
  try {
    const c = await cookies();
    const cookieVal = c.get(cookieName)?.value;
    if (cookieVal && UUID_RE.test(cookieVal)) return cookieVal;
  } catch {
    // cookies() throws outside request scope.
  }
  return null;
}

/**
 * Allow dogfood / scenario tests to swap which tenant the dev-bypass user
 * is loaded into. Accepts either `x-dev-bypass-tenant` HTTP header (curl-
 * friendly) OR `dev_bypass_tenant_id` cookie (browser-friendly via the
 * impersonator UI). Header wins when both are present.
 *
 * Only honored while `isDevAuthBypassActive()` is true (triple-guarded).
 */
async function resolveBypassTenantId(): Promise<string> {
  const override = await readOverride('x-dev-bypass-tenant', DEV_BYPASS_TENANT_COOKIE);
  if (override) {
    const t = await prisma.tenant.findUnique({
      where: { id: override },
      select: { id: true },
    });
    if (t) return t.id;
  }
  return DEV_BYPASS_TENANT_ID;
}

/**
 * Resolve the active dev-bypass user id. Same precedence as tenant override:
 * header first, then cookie. Returns the fixed dev-bypass sentinel when no
 * override is set OR the override user has no membership in the resolved
 * tenant (defensive: never put the operator in a tenant they can't access).
 */
async function resolveBypassUserId(tenantId: string): Promise<string> {
  const override = await readOverride('x-dev-bypass-user', DEV_BYPASS_USER_COOKIE);
  if (!override) return DEV_BYPASS_USER_ID;
  const membership = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId: override } },
    select: { id: true },
  });
  if (!membership) return DEV_BYPASS_USER_ID;
  return override;
}
export const DEV_BYPASS_USER_ID = '00000000-0000-0000-0000-000000d3b002';
export const DEV_BYPASS_CLERK_ORG_ID = 'org_dev_bypass';
export const DEV_BYPASS_CLERK_USER_ID = 'user_dev_bypass';

let warnedThisProcess = false;

export function isDevAuthBypassActive(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const active = process.env.DEV_AUTH_BYPASS === '1';
  if (active && !warnedThisProcess) {
    warnedThisProcess = true;
    // Loud one-shot warning so this never silently activates somewhere
    // unexpected (e.g. on a CI runner that pulled .env.local by mistake).
    console.warn(
      '\n[dev-bypass] ⚠ Clerk auth disabled — using a fixed dev tenant + user.\n' +
        '             Only safe on localhost. Never set DEV_AUTH_BYPASS=1 in production env.\n',
    );
  }
  return active;
}

/**
 * Returns a full AppContext for the dev tenant, creating the tenant + user
 * + owner-role membership if they don't exist yet. Caching is intentionally
 * disabled so DB truncate/reseed workflows don't leave a stale ctx in memory
 * after the developer wipes data; the upsert chain is cheap in dev.
 */
export async function getOrCreateDevBypassContext(): Promise<AppContext> {
  const resolvedTenantId = await resolveBypassTenantId();
  const isDefaultTenant = resolvedTenantId === DEV_BYPASS_TENANT_ID;
  const resolvedUserId = await resolveBypassUserId(resolvedTenantId);
  const isDefaultUser = resolvedUserId === DEV_BYPASS_USER_ID;
  const ctx = await withBypass(async (tx) => {
    const tenant = isDefaultTenant
      ? await tx.tenant.upsert({
          where: { id: DEV_BYPASS_TENANT_ID },
          create: {
            id: DEV_BYPASS_TENANT_ID,
            clerkOrgId: DEV_BYPASS_CLERK_ORG_ID,
            name: 'Dev Bypass',
            slug: 'dev-bypass',
            currency: 'USD',
            plan: 'enterprise',
            trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
          update: {},
        })
      : await tx.tenant.findUniqueOrThrow({ where: { id: resolvedTenantId } });
    await seedSystemRoles(tenant.id, tx);

    const user = isDefaultUser
      ? await tx.user.upsert({
          where: { id: DEV_BYPASS_USER_ID },
          create: {
            id: DEV_BYPASS_USER_ID,
            clerkId: DEV_BYPASS_CLERK_USER_ID,
            // Must be a valid email — the mobile `/me` contract (MeResponseSchema)
            // runs Zod `.email()` on it, and `…@localhost` (no dot in the domain)
            // fails that check, 500ing every mobile launch under dev-bypass.
            email: 'dev-bypass@ishflow.dev',
            firstName: 'Dev',
            lastName: 'Bypass',
          },
          // Heal the pre-existing row that may still carry the old invalid
          // `…@localhost` email from before this fix.
          update: { email: 'dev-bypass@ishflow.dev' },
        })
      : await tx.user.findUniqueOrThrow({ where: { id: resolvedUserId } });

    if (isDefaultUser) {
      const ownerRole = await tx.role.findUniqueOrThrow({
        where: { tenantId_name: { tenantId: tenant.id, name: 'owner' } },
        include: { scopes: true },
      });
      await tx.membership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          roles: { connect: { id: ownerRole.id } },
        },
        update: { roles: { set: [{ id: ownerRole.id }] } },
      });
    }
    // For impersonated user, the membership + roles came from the seed
    // script — never auto-grant owner. The role-based UI must respect
    // whatever permissions the seeded role(s) carry.

    const membership = await tx.membership.findUniqueOrThrow({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      include: { roles: { include: { scopes: true } } },
    });

    const { permissions, scopesByEntity } = buildPermissionAndScopeData(membership.roles);

    return {
      user,
      tenant,
      membership,
      permissions,
      scopesByEntity,
      addons: EMPTY_ADDON_SET,
    } satisfies AppContext;
  });

  return ctx;
}

// Re-export prisma to keep this module self-contained for callers that want
// to extend the dev bypass (e.g. swapping the tenant) without pulling
// additional imports.
export { prisma };
