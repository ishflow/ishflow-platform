'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { revalidatePath } from 'next/cache';

export type CreateRoleState = { ok: true; id: string } | { ok: false; error: string } | null;

export async function createRoleV2Action(
  _prev: CreateRoleState,
  formData: FormData,
): Promise<CreateRoleState> {
  const ctx = await requireTenantContext();
  if (!hasPermission(ctx.permissions, 'admin.roles:manage')) {
    return { ok: false, error: 'forbidden' };
  }

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const cloneFromRaw = String(formData.get('cloneFromId') ?? '');
  const cloneFromId = cloneFromRaw && cloneFromRaw !== 'none' ? cloneFromRaw : null;
  if (!name) return { ok: false, error: 'name_required' };

  try {
    const created = await withTenant(ctx.tenant.id, async (tx) => {
      let permissions: string[] = [];
      if (cloneFromId) {
        const src = await tx.role.findUnique({
          where: { id: cloneFromId },
          select: { permissions: true },
        });
        permissions = src?.permissions ?? [];
      }
      return tx.role.create({
        data: {
          tenantId: ctx.tenant.id,
          name,
          description,
          isSystem: false,
          permissions,
        },
        select: { id: true },
      });
    });
    revalidatePath('/admin/roles');
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}
