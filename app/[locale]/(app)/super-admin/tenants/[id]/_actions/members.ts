'use server';

import { writeSaAudit } from '@/lib/v2-super-admin/audit-helper';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const changeRoleSchema = z.object({
  tenantId: z.string().uuid(),
  membershipId: z.string().uuid(),
  roleId: z.string().uuid(),
});

const removeSchema = z.object({
  tenantId: z.string().uuid(),
  membershipId: z.string().uuid(),
});

export async function changeRole(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const parsed = changeRoleSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    membershipId: String(formData.get('membershipId') ?? ''),
    roleId: String(formData.get('roleId') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const { tenantId, membershipId, roleId } = parsed.data;

  await withBypass(async (tx) => {
    const before = await tx.membership.findUnique({
      where: { id: membershipId },
      include: { roles: { select: { id: true, name: true } } },
    });
    if (!before || before.tenantId !== tenantId) {
      throw new Error('membership not found');
    }
    const role = await tx.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, tenantId: true },
    });
    if (!role || role.tenantId !== tenantId) {
      throw new Error('role not found in this tenant');
    }

    // Refuse to demote the tenant's last owner (set: replaces all roles, so a
    // non-owner target role would strip the owner role) — would orphan the org.
    const wasOwner = before.roles.some((r) => r.name === 'owner');
    if (wasOwner && role.name !== 'owner') {
      const otherOwners = await tx.membership.count({
        where: {
          tenantId,
          id: { not: membershipId },
          roles: { some: { name: 'owner', isSystem: true } },
        },
      });
      if (otherOwners === 0) throw new Error('last_owner');
    }

    await tx.membership.update({
      where: { id: membershipId },
      data: { roles: { set: [{ id: roleId }] } },
    });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'member.role_changed',
      tenantId,
      targetUserId: before.userId,
      before: {
        roleIds: before.roles.map((r) => r.id),
        roleNames: before.roles.map((r) => r.name),
      },
      after: { roleIds: [role.id], roleNames: [role.name] },
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/users`);
}

export async function removeMember(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const parsed = removeSchema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    membershipId: String(formData.get('membershipId') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const { tenantId, membershipId } = parsed.data;

  await withBypass(async (tx) => {
    const before = await tx.membership.findUnique({
      where: { id: membershipId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        roles: { select: { id: true, name: true } },
      },
    });
    if (!before || before.tenantId !== tenantId) return;

    // Refuse to remove the tenant's last owner — that would orphan it with
    // nobody able to administer the org.
    const isOwner = before.roles.some((r) => r.name === 'owner');
    if (isOwner) {
      const otherOwners = await tx.membership.count({
        where: {
          tenantId,
          id: { not: membershipId },
          roles: { some: { name: 'owner', isSystem: true } },
        },
      });
      if (otherOwners === 0) throw new Error('last_owner');
    }

    await tx.membership.delete({ where: { id: membershipId } });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'member.removed',
      tenantId,
      targetUserId: before.userId,
      before: {
        userId: before.userId,
        email: before.user.email,
        roleIds: before.roles.map((r) => r.id),
        roleNames: before.roles.map((r) => r.name),
      },
      after: null,
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/users`);
}
