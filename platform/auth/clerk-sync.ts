import { withBypass } from '@/platform/db/tenant-context';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import { type SystemRoleName, seedSystemRoles } from './seed-system-roles';

export const userPayloadSchema = z.object({
  id: z.string(),
  email_addresses: z.array(z.object({ email_address: z.string() })).default([]),
  first_name: z.string().nullable().optional().default(null),
  last_name: z.string().nullable().optional().default(null),
  image_url: z.string().nullable().optional().default(null),
});

export const userDeletedPayloadSchema = z.object({ id: z.string() });

export const orgPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const orgDeletedPayloadSchema = z.object({ id: z.string() });

export const membershipPayloadSchema = z.object({
  organization: z.object({ id: z.string() }),
  public_user_data: z.object({
    user_id: z.string(),
    identifier: z.string().optional(),
  }),
  role: z.string().optional(),
});

export type UserPayload = z.infer<typeof userPayloadSchema>;
export type UserDeletedPayload = z.infer<typeof userDeletedPayloadSchema>;
export type OrgPayload = z.infer<typeof orgPayloadSchema>;
export type OrgDeletedPayload = z.infer<typeof orgDeletedPayloadSchema>;
export type MembershipPayload = z.infer<typeof membershipPayloadSchema>;

function mapRole(clerkRole: string | undefined): SystemRoleName {
  switch (clerkRole) {
    case 'org:admin':
      return 'admin';
    case 'org:owner':
      return 'owner';
    case 'org:viewer':
      return 'viewer';
    case 'org:bookkeeper':
      return 'bookkeeper';
    case 'org:sales':
      return 'sales';
    case 'org:warehouse':
      return 'warehouse';
    default:
      // Safe-by-default: any unknown Clerk role (including the standard
      // `org:member` for invited users) becomes a read-only viewer. Owner
      // can promote them via /admin/members.
      return 'viewer';
  }
}

const SYSTEM_ROLE_NAMES = [
  'owner',
  'admin',
  'viewer',
  'bookkeeper',
  'sales',
  'warehouse',
  'chief_accountant',
  'cashier',
  'buyer',
] as const;

function isSystemRoleName(value: unknown): value is SystemRoleName {
  return typeof value === 'string' && (SYSTEM_ROLE_NAMES as readonly string[]).includes(value);
}

/**
 * Look up the role chosen at invite time from the Clerk invitation's
 * `publicMetadata.systemRole`. Prefers an `accepted` invite, then falls back
 * to a `pending` one (the webhook can fire before Clerk flips the status).
 *
 * Returns `null` when no matching invitation exists, when the stored value
 * isn't a known system role, or when the stored value is `owner` —
 * ownership transfer is its own flow and must never happen via invite.
 */
async function lookupInvitationRole(
  clerkOrganizationId: string,
  email: string,
): Promise<SystemRoleName | null> {
  const clerk = await clerkClient();
  const list = await clerk.organizations.getOrganizationInvitationList({
    organizationId: clerkOrganizationId,
    status: ['accepted', 'pending'],
  });
  const normalized = email.toLowerCase();
  const match =
    list.data.find((i) => i.emailAddress.toLowerCase() === normalized && i.status === 'accepted') ??
    list.data.find((i) => i.emailAddress.toLowerCase() === normalized && i.status === 'pending');
  if (!match) return null;
  const meta = (match.publicMetadata ?? {}) as Record<string, unknown>;
  const role = meta.systemRole;
  if (!isSystemRoleName(role) || role === 'owner') return null;
  return role;
}

/**
 * Race-tolerant wrapper around {@link lookupInvitationRole}. Clerk's
 * `organizationMembership.created` webhook can arrive before the matching
 * invitation transitions `pending → accepted`. If the first lookup turns up
 * nothing, retry once after 500ms before giving up.
 */
async function lookupInvitationRoleWithRetry(
  clerkOrganizationId: string,
  email: string,
): Promise<SystemRoleName | null> {
  const first = await lookupInvitationRole(clerkOrganizationId, email);
  if (first) return first;
  await new Promise((resolve) => setTimeout(resolve, 500));
  return lookupInvitationRole(clerkOrganizationId, email);
}

export async function handleUserCreated(payload: UserPayload): Promise<void> {
  const email = payload.email_addresses[0]?.email_address;
  if (!email) throw new Error('user.created without email_address');
  await withBypass((tx) =>
    tx.user.upsert({
      where: { clerkId: payload.id },
      create: {
        clerkId: payload.id,
        email,
        firstName: payload.first_name,
        lastName: payload.last_name,
        imageUrl: payload.image_url,
      },
      update: {
        email,
        firstName: payload.first_name,
        lastName: payload.last_name,
        imageUrl: payload.image_url,
      },
    }),
  );
}

export async function handleUserUpdated(payload: UserPayload): Promise<void> {
  return handleUserCreated(payload);
}

export async function handleUserDeleted(payload: UserDeletedPayload): Promise<void> {
  await withBypass((tx) => tx.user.deleteMany({ where: { clerkId: payload.id } }));
}

export async function handleOrganizationCreated(payload: OrgPayload): Promise<void> {
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { clerkOrgId: payload.id },
      create: {
        clerkOrgId: payload.id,
        name: payload.name,
        slug: payload.slug,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      update: { name: payload.name, slug: payload.slug, deletedAt: null },
    });
    await seedSystemRoles(tenant.id, tx);
  });
}

export async function handleOrganizationUpdated(payload: OrgPayload): Promise<void> {
  return handleOrganizationCreated(payload);
}

export async function handleOrganizationDeleted(payload: OrgDeletedPayload): Promise<void> {
  await withBypass((tx) =>
    tx.tenant.updateMany({
      where: { clerkOrgId: payload.id, deletedAt: null },
      data: { deletedAt: new Date(), status: 'cancelled' },
    }),
  );
}

export async function handleOrganizationMembershipCreated(
  payload: MembershipPayload,
): Promise<void> {
  let roleName: SystemRoleName = mapRole(payload.role);
  const inviteEmail = payload.public_user_data.identifier;
  if (inviteEmail) {
    try {
      const fromInvite = await lookupInvitationRoleWithRetry(payload.organization.id, inviteEmail);
      if (fromInvite) roleName = fromInvite;
    } catch {
      // Clerk lookup failed — fall back to mapRole result. No-op.
    }
  }
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { clerkOrgId: payload.organization.id },
    });
    const user = await tx.user.findUniqueOrThrow({
      where: { clerkId: payload.public_user_data.user_id },
    });
    // Make sure system roles exist (covers orgs created before this deploy).
    await seedSystemRoles(tenant.id, tx);

    // Auto-promote first admin to owner if tenant has no owner yet.
    if (roleName === 'admin') {
      const ownerCount = await tx.membership.count({
        where: {
          tenantId: tenant.id,
          roles: { some: { name: 'owner', isSystem: true } },
        },
      });
      if (ownerCount === 0) {
        roleName = 'owner';
      }
    }

    const role = await tx.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId: tenant.id, name: roleName } },
      select: { id: true },
    });
    await tx.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        roles: { connect: { id: role.id } },
      },
      update: {
        roles: { set: [{ id: role.id }] },
      },
    });
  });
}

export async function handleOrganizationMembershipUpdated(
  payload: MembershipPayload,
): Promise<void> {
  return handleOrganizationMembershipCreated(payload);
}

/**
 * Idempotent membership sync used by `/me` listing — creates a membership
 * row only when one does not already exist for the (tenant, user) pair.
 * Crucially, an EXISTING membership's roles are left untouched, so role
 * changes made via web `/admin/members` survive subsequent /me calls.
 *
 * Use this for the no-webhook prod fallback path. Use
 * `handleOrganizationMembershipCreated` for the actual webhook path —
 * that one intentionally overwrites roles because Clerk is the trigger.
 */
export async function syncMissingMembership(payload: MembershipPayload): Promise<void> {
  let roleName: SystemRoleName = mapRole(payload.role);
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { clerkOrgId: payload.organization.id },
    });
    const user = await tx.user.findUniqueOrThrow({
      where: { clerkId: payload.public_user_data.user_id },
    });
    // Membership already in DB? Leave it alone — web admin is the source of
    // truth for role changes, and we must never silently overwrite them.
    const existing = await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      select: { id: true },
    });
    if (existing) return;

    // New membership — pick the chosen role from the originating invitation
    // (if any) BEFORE the first-admin auto-owner check, so an invited admin
    // still gets the auto-promote treatment when applicable.
    const inviteEmail = payload.public_user_data.identifier;
    if (inviteEmail) {
      try {
        const fromInvite = await lookupInvitationRoleWithRetry(
          payload.organization.id,
          inviteEmail,
        );
        if (fromInvite) roleName = fromInvite;
      } catch {
        // Clerk lookup failed — fall back to mapRole result. No-op.
      }
    }

    // Make sure system roles exist, then mirror Clerk's initial role.
    await seedSystemRoles(tenant.id, tx);
    if (roleName === 'admin') {
      const ownerCount = await tx.membership.count({
        where: {
          tenantId: tenant.id,
          roles: { some: { name: 'owner', isSystem: true } },
        },
      });
      if (ownerCount === 0) roleName = 'owner';
    }
    const role = await tx.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId: tenant.id, name: roleName } },
      select: { id: true },
    });
    await tx.membership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        roles: { connect: { id: role.id } },
      },
    });
  });
}

export async function handleOrganizationMembershipDeleted(
  payload: MembershipPayload,
): Promise<void> {
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { clerkOrgId: payload.organization.id },
    });
    const user = await tx.user.findUniqueOrThrow({
      where: { clerkId: payload.public_user_data.user_id },
    });
    await tx.membership.deleteMany({ where: { tenantId: tenant.id, userId: user.id } });
  });
}
