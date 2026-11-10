import {
  handleOrganizationCreated,
  handleOrganizationMembershipCreated,
} from '@/platform/auth/clerk-sync';
import { pickPrimaryRoleName } from '@/platform/auth/pick-primary-role';
import { withBypass } from '@/platform/db/tenant-context';
import { DEFAULT_MOBILE_FEATURES, MeResponseSchema } from '@ishflow/mobile-api-contract';
import { clerkClient } from '@clerk/nextjs/server';
import type { Membership, Tenant, User } from '@prisma/client';

export type TenantFeatures = Record<string, boolean>;

/**
 * One row of the membership roll-up used to render the mobile org switcher.
 * Includes the tenant's mobile features and the user's highest-precedence
 * role inside that tenant.
 */
export type TenantMembershipRow = {
  id: string;
  slug: string;
  name: string;
  currency: string;
  mobileFeatures: TenantFeatures | null;
  role: string | null;
};

/**
 * Subset of a tenant the response builder actually reads. Lets callers pass
 * a Prisma `Tenant` directly or a hand-rolled subset (e.g. when switching
 * to a tenant we already fetched as part of a membership join).
 */
export type ActiveTenantInput = Pick<Tenant, 'id' | 'slug' | 'name' | 'currency'> & {
  mobileFeatures?: TenantFeatures | null;
};

/**
 * Subset of the active membership the response builder reads. The role
 * list drives the `tenant.role` badge.
 */
export type ActiveMembershipInput = {
  roles: Array<{ name: string }>;
};

export type UserInput = Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'imageUrl'>;

/**
 * Layers a tenant's stored `mobileFeatures` JSON on top of the global
 * defaults so the wire shape always carries every flag the client expects.
 */
export function mergeFeatures(extra: TenantFeatures | null | undefined): typeof DEFAULT_MOBILE_FEATURES {
  return { ...DEFAULT_MOBILE_FEATURES, ...(extra ?? {}) };
}

/**
 * Loads every tenant the user has an active membership in, with the role
 * they hold in each. Uses `withBypass` because we legitimately need to
 * cross tenant boundaries to enumerate "all places this user can switch
 * to". RLS would otherwise hide every row outside the active tenant.
 *
 * Lazy-syncs Clerk memberships before reading. The dev webhook isn't
 * always registered and `resolveContext` only syncs the *active* org, so
 * without this a user with N Clerk orgs would only see the one they last
 * switched to.
 */
export async function listTenantsForUser(userId: string): Promise<TenantMembershipRow[]> {
  await syncClerkMembershipsForUser(userId).catch((err) => {
    console.error('[listTenantsForUser] clerk membership sync failed', err);
  });

  return withBypass(async (tx) => {
    const memberships = await tx.membership.findMany({
      where: { userId, tenant: { deletedAt: null } },
      include: {
        tenant: {
          select: { id: true, slug: true, name: true, currency: true, mobileFeatures: true },
        },
        roles: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.tenant.id,
      slug: m.tenant.slug,
      name: m.tenant.name,
      currency: m.tenant.currency ?? 'USD',
      mobileFeatures: (m.tenant.mobileFeatures as TenantFeatures | null) ?? null,
      role: pickPrimaryRoleName(m.roles),
    }));
  });
}

/**
 * Walks every Clerk organization membership this user holds and upserts
 * the matching `Tenant` + `Membership` rows locally. Idempotent: relies on
 * the same upsert handlers `resolveContext` already uses for the active
 * org. Bounded by Clerk's per-user membership count (typically <10), so
 * the extra Clerk round-trip is acceptable on `/me` and `/tenant/switch`.
 */
async function syncClerkMembershipsForUser(userId: string): Promise<void> {
  const user = await withBypass((tx) =>
    tx.user.findUnique({ where: { id: userId }, select: { clerkId: true } }),
  );
  if (!user?.clerkId) return;

  const clerk = await clerkClient();
  const list = await clerk.users.getOrganizationMembershipList({ userId: user.clerkId });

  for (const m of list.data) {
    const org = m.organization;
    if (!org) continue;
    await handleOrganizationCreated({
      id: org.id,
      name: org.name,
      slug: org.slug ?? `${org.id.slice(4, 12)}`,
    });
    await handleOrganizationMembershipCreated({
      organization: { id: org.id },
      public_user_data: { user_id: user.clerkId },
      role: m.role,
    });
  }
}

export type BuildMeResponseInput = {
  user: UserInput;
  /** The tenant the response should report as currently active. `null` when the user has no active selection. */
  activeTenant: ActiveTenantInput | null;
  /** The membership that pins `activeTenant` for this user; drives the role badge. */
  activeMembership: ActiveMembershipInput | null;
  /** Permissions granted in the active tenant. */
  permissions: Iterable<string>;
  /** Pre-loaded membership roll-up; pass the output of `listTenantsForUser`. */
  tenants: TenantMembershipRow[];
};

/**
 * Pure builder for the `MeResponse` wire body. Both `GET /api/mobile/me`
 * and `POST /api/mobile/tenant/switch` go through this so the two
 * endpoints can't drift.
 */
export function buildMeResponse(input: BuildMeResponseInput) {
  const activeRole = input.activeMembership
    ? pickPrimaryRoleName(input.activeMembership.roles)
    : null;

  const tenant = input.activeTenant
    ? {
        id: input.activeTenant.id,
        slug: input.activeTenant.slug,
        name: input.activeTenant.name,
        currency: input.activeTenant.currency ?? 'USD',
        mobileFeatures: mergeFeatures(input.activeTenant.mobileFeatures),
        role: activeRole,
      }
    : null;

  const tenants = input.tenants.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    currency: m.currency,
    mobileFeatures: mergeFeatures(m.mobileFeatures),
    role: m.role,
  }));

  return MeResponseSchema.parse({
    user: {
      id: input.user.id,
      email: input.user.email,
      firstName: input.user.firstName,
      lastName: input.user.lastName,
      imageUrl: input.user.imageUrl,
    },
    tenant,
    permissions: [...input.permissions],
    tenants,
  });
}

/**
 * Re-export so `Membership` consumers (e.g. tests) can satisfy
 * `ActiveMembershipInput` without importing Prisma directly. The wire
 * builder never reads anything off Membership beyond `roles[].name`.
 */
export type { Membership };
