'use server';
import { requireTenantContext } from '@/platform/auth/current-context';
import { enforcePlanLimit } from '@/platform/billing/enforce';
import { withTenant } from '@/platform/db/tenant-context';
import { writeAudit } from '@/platform/engine/audit-log';
import { PlanLimitError } from '@/platform/engine/errors';
import { hasPermission } from '@/platform/engine/permissions';
import { clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

async function requireMembersAdmin() {
  const ctx = await requireTenantContext();
  if (!hasPermission(ctx.permissions, 'admin.members:manage')) {
    throw new Error('FORBIDDEN');
  }
  return ctx;
}

async function requireOwner(permission: 'owner:assign_owner_role' | 'owner:remove_admin') {
  const ctx = await requireMembersAdmin();
  if (!hasPermission(ctx.permissions, permission)) {
    throw new Error('FORBIDDEN');
  }
  return ctx;
}

export async function listMembersAction() {
  const ctx = await requireMembersAdmin();
  return withTenant(ctx.tenant.id, (tx) =>
    tx.membership.findMany({
      include: { user: true, roles: true },
      orderBy: { createdAt: 'asc' },
    }),
  );
}

export async function listRoleOptionsAction() {
  const ctx = await requireMembersAdmin();
  return withTenant(ctx.tenant.id, (tx) =>
    tx.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, isSystem: true },
    }),
  );
}

export async function assignRoleAction(membershipId: string, roleId: string): Promise<void> {
  const ctx = await requireMembersAdmin();
  await withTenant(ctx.tenant.id, async (tx) => {
    const role = await tx.role.findUniqueOrThrow({ where: { id: roleId } });
    // Defense-in-depth behind RLS: never act on a role from another tenant. A4.
    if (role.tenantId !== ctx.tenant.id) throw new Error('invalid_role');
    if (role.isSystem && role.name === 'owner') {
      throw new Error('Cannot assign owner role directly');
    }
    await tx.membership.update({
      where: { id: membershipId },
      data: { roles: { connect: { id: roleId } } },
    });
  });
  revalidatePath('/admin/members');
}

export async function removeRoleAction(membershipId: string, roleId: string): Promise<void> {
  const ctx = await requireMembersAdmin();
  await withTenant(ctx.tenant.id, async (tx) => {
    const role = await tx.role.findUniqueOrThrow({ where: { id: roleId } });
    // Defense-in-depth behind RLS: never act on a role from another tenant. A4.
    if (role.tenantId !== ctx.tenant.id) throw new Error('invalid_role');
    if (role.isSystem && role.name === 'owner') {
      throw new Error('Cannot remove owner role directly');
    }
    await tx.membership.update({
      where: { id: membershipId },
      data: { roles: { disconnect: { id: roleId } } },
    });
  });
  revalidatePath('/admin/members');
}

/**
 * Replace a member's roles with a single chosen role. This is the
 * "change role" primitive the members UI uses (the connect/disconnect pair
 * above is for additive multi-role edits). Guards:
 *  - role must belong to the caller's tenant,
 *  - `owner` can never be assigned by invite/role-change (own flow),
 *  - the last remaining owner can never be demoted (would orphan the tenant).
 */
export async function setMemberRoleAction(
  membershipId: string,
  roleId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireMembersAdmin();
  const result = await withTenant(
    ctx.tenant.id,
    async (tx): Promise<{ ok: true } | { ok: false; error: string }> => {
      const role = await tx.role.findUnique({ where: { id: roleId } });
      if (!role || role.tenantId !== ctx.tenant.id) return { ok: false, error: 'invalid_role' };
      if (role.isSystem && role.name === 'owner')
        return { ok: false, error: 'cannot_assign_owner' };

      const target = await tx.membership.findUnique({
        where: { id: membershipId },
        include: { roles: { select: { name: true, isSystem: true } } },
      });
      if (!target || target.tenantId !== ctx.tenant.id) return { ok: false, error: 'not_found' };

      // Never demote the last remaining owner.
      if (target.roles.some((r) => r.isSystem && r.name === 'owner')) {
        const ownerCount = await tx.membership.count({
          where: { tenantId: ctx.tenant.id, roles: { some: { name: 'owner', isSystem: true } } },
        });
        if (ownerCount <= 1) return { ok: false, error: 'last_owner' };
      }

      await tx.membership.update({
        where: { id: membershipId },
        data: { roles: { set: [{ id: roleId }] } },
      });
      return { ok: true };
    },
  );
  if (result.ok) {
    revalidatePath('/admin/members');
    await writeAudit(null, ctx, {
      entity: 'tenant.member',
      entityId: membershipId,
      action: 'update',
      after: { roleId },
      source: 'web',
    });
  }
  return result;
}

export async function removeAdminMemberAction(membershipId: string): Promise<void> {
  const ctx = await requireOwner('owner:remove_admin');
  await withTenant(ctx.tenant.id, async (tx) => {
    await tx.membership.delete({
      where: { id: membershipId },
    });
  });
  await writeAudit(null, ctx, {
    entity: 'tenant.member',
    entityId: membershipId,
    action: 'delete',
    source: 'web',
  });
  revalidatePath('/admin/members');
}

// Invitable system roles. `owner` is intentionally excluded — owners are minted
// via the workspace bootstrap flow, never by invitation.
const SYSTEM_ROLE_NAMES = [
  'admin',
  'viewer',
  'bookkeeper',
  'sales',
  'warehouse',
  'chief_accountant',
  'cashier',
  'buyer',
] as const;

const inviteSchema = z.object({
  email: z.string().email(),
  systemRole: z.enum(SYSTEM_ROLE_NAMES),
});

// Clerk requires an absolute `redirectUrl` on org invitations. The email link
// lands here, on our platform-adaptive bridge (`/invite/continue`), instead of
// Clerk's hosted default sign-up. Default locale (`ru`) carries no prefix, so
// the bare `/invite/continue` path is correct.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ishflow.com';
const INVITE_REDIRECT_URL = `${APP_URL}/invite/continue`;

export async function inviteMemberAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireMembersAdmin();
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    systemRole: formData.get('systemRole'),
  });
  if (!parsed.success) {
    const issues = parsed.error.issues;
    const hasRoleIssue = issues.some((i) => i.path[0] === 'systemRole');
    return { ok: false, error: hasRoleIssue ? 'invalid_role' : 'invalid_email' };
  }

  // Plan-limit guard. With MODE=on, throws PlanLimitError when the tenant is at
  // its member ceiling; we surface it as a structured form-error code rather
  // than throwing so the UI can render an upgrade CTA.
  try {
    await enforcePlanLimit(ctx.tenant, { kind: 'add_member' });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return { ok: false, error: `plan_limit.${err.kind}` };
    }
    throw err;
  }

  const clerk = await clerkClient();
  try {
    await clerk.organizations.createOrganizationInvitation({
      organizationId: ctx.tenant.clerkOrgId,
      emailAddress: parsed.data.email,
      role: 'org:member',
      publicMetadata: { systemRole: parsed.data.systemRole },
      inviterUserId: ctx.user.clerkId,
      redirectUrl: INVITE_REDIRECT_URL,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.toLowerCase().includes('already')) return { ok: false, error: 'already_member' };
    return { ok: false, error: 'clerk_error' };
  }

  await writeAudit(null, ctx, {
    entity: 'tenant.member_invite',
    entityId: parsed.data.email,
    action: 'invite',
    after: { email: parsed.data.email, systemRole: parsed.data.systemRole },
    source: 'web',
  });
  revalidatePath('/admin/members');
  return { ok: true };
}

const resendSchema = z.object({
  invitationId: z.string().min(1),
  email: z.string().email(),
  systemRole: z.enum(SYSTEM_ROLE_NAMES),
});

export async function resendInvitationAction(
  invitationId: string,
  email: string,
  systemRole: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireMembersAdmin();
  const parsed = resendSchema.safeParse({ invitationId, email, systemRole });
  if (!parsed.success) return { ok: false, error: 'invalid_input' };

  const clerk = await clerkClient();
  // Clerk has no "resend" primitive — revoke the stale invite, then mint a
  // fresh one (which re-sends the email). Best-effort revoke so a failed
  // revoke doesn't block re-inviting.
  try {
    await clerk.organizations.revokeOrganizationInvitation({
      organizationId: ctx.tenant.clerkOrgId,
      invitationId: parsed.data.invitationId,
      requestingUserId: ctx.user.clerkId,
    });
  } catch {
    // ignore — may already be gone
  }
  try {
    await clerk.organizations.createOrganizationInvitation({
      organizationId: ctx.tenant.clerkOrgId,
      emailAddress: parsed.data.email,
      role: 'org:member',
      publicMetadata: { systemRole: parsed.data.systemRole },
      inviterUserId: ctx.user.clerkId,
      redirectUrl: INVITE_REDIRECT_URL,
    });
  } catch {
    return { ok: false, error: 'clerk_error' };
  }
  revalidatePath('/admin/members');
  return { ok: true };
}

const cancelSchema = z.object({ invitationId: z.string().min(1) });

export async function cancelInvitationAction(
  invitationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireMembersAdmin();
  const parsed = cancelSchema.safeParse({ invitationId });
  if (!parsed.success) return { ok: false, error: 'invalid_input' };

  const clerk = await clerkClient();
  try {
    await clerk.organizations.revokeOrganizationInvitation({
      organizationId: ctx.tenant.clerkOrgId,
      invitationId: parsed.data.invitationId,
      requestingUserId: ctx.user.clerkId,
    });
  } catch (_err) {
    return { ok: false, error: 'clerk_error' };
  }

  revalidatePath('/admin/members');
  return { ok: true };
}
