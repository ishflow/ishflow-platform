'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withBypass } from '@/platform/db/tenant-context';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

/**
 * Switch the signed-in user's active organization (tenant).
 *
 * Web Clerk sessions never call `setActive({ organization })`, so the JWT's
 * `org_id` claim is empty and `resolveContext` falls back to
 * `publicMetadata.activeTenantId` (the exact mechanism mobile already uses —
 * see `resolveFromClerkClaims`). Persisting the chosen tenant there makes the
 * next request resolve to it. The caller does a full navigation afterwards so
 * the (app) layout re-runs server-side with the new tenant context.
 *
 * Validates membership first so a user can never pin themselves to a tenant
 * they don't belong to (RLS would block reads anyway, but fail fast + clean).
 */
export async function switchTenantAction(
  tenantId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'not_signed_in' };
  if (!tenantId) return { ok: false, error: 'invalid' };

  const belongs = await withBypass(async (tx) => {
    const user = await tx.user.findUnique({ where: { clerkId: userId } });
    if (!user) return false;
    const membership = await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      select: { id: true },
    });
    if (!membership) return false;
    const tenant = await tx.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true },
    });
    return Boolean(tenant);
  });
  if (!belongs) return { ok: false, error: 'not_a_member' };

  try {
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { activeTenantId: tenantId },
    });
  } catch (err) {
    console.error('[switch-tenant] updateUserMetadata failed', err);
    return { ok: false, error: 'clerk_error' };
  }

  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * Leave the currently-active organization. Removes the signed-in user's Clerk
 * org membership (so the next `/me` sync can't recreate it) and the local
 * membership row, then repoints `activeTenantId` at the user's next tenant
 * (oldest remaining) — or clears it, sending them to onboarding.
 *
 * Guard: the last remaining owner can never leave (it would orphan the tenant);
 * they must transfer ownership or delete the workspace first.
 */
export async function leaveOrgAction(): Promise<
  { ok: true; nextTenantId: string | null } | { ok: false; error: string }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'not_signed_in' };

  const ctx = await requireTenantContext();
  const tenantId = ctx.tenant.id;
  const clerkOrgId = ctx.tenant.clerkOrgId;
  const dbUserId = ctx.user.id;

  const guard = await withBypass(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId: dbUserId } },
      include: { roles: { select: { name: true, isSystem: true } } },
    });
    if (!membership) return 'not_member';
    const isOwner = membership.roles.some((r) => r.isSystem && r.name === 'owner');
    if (isOwner) {
      const owners = await tx.membership.count({
        where: { tenantId, roles: { some: { name: 'owner', isSystem: true } } },
      });
      if (owners <= 1) return 'last_owner';
    }
    return null;
  });
  if (guard) return { ok: false, error: guard };

  // Drop the Clerk org membership first so the next /me sync can't recreate the
  // row; best-effort so a Clerk hiccup doesn't strand the user in the org.
  if (clerkOrgId) {
    try {
      const clerk = await clerkClient();
      await clerk.organizations.deleteOrganizationMembership({
        organizationId: clerkOrgId,
        userId: ctx.user.clerkId,
      });
    } catch (err) {
      console.error('[leave-org] deleteOrganizationMembership failed', err);
    }
  }
  await withBypass((tx) => tx.membership.deleteMany({ where: { tenantId, userId: dbUserId } }));

  const nextTenantId = await withBypass(async (tx) => {
    const next = await tx.membership.findFirst({
      where: { userId: dbUserId, tenant: { deletedAt: null } },
      select: { tenantId: true },
      orderBy: { createdAt: 'asc' },
    });
    return next?.tenantId ?? null;
  });

  try {
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(ctx.user.clerkId, {
      publicMetadata: { activeTenantId: nextTenantId ?? null },
    });
  } catch (err) {
    console.error('[leave-org] updateUserMetadata failed', err);
  }

  revalidatePath('/', 'layout');
  return { ok: true, nextTenantId };
}
