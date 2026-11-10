'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import {
  type SavedFilterCriteria,
  createSavedFilter,
  deleteSavedFilter,
} from '@/platform/super-admin/audit-pro/saved-filters';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

async function reqMeta() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for') ?? null,
    userAgent: h.get('user-agent') ?? null,
  };
}

/**
 * Persist a named filter for the current operator. The criteria payload
 * mirrors the SA audit page query-string keys so reapplying the filter is
 * just `setSearchParams(criteria)`.
 */
export async function saveAuditFilter(
  name: string,
  criteria: SavedFilterCriteria,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await assertSuperAdmin();
    const meta = await reqMeta();
    const row = await createSavedFilter({
      name,
      ownerClerkId: ctx.user.clerkId,
      criteria,
    });
    await withBypass((tx) =>
      tx.platformAuditLog.create({
        data: {
          actorClerkId: ctx.user.clerkId,
          action: 'audit.saved_filter_created',
          before: Prisma.JsonNull,
          after: { id: row.id, name: row.name, criteria },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    );
    revalidatePath('/super-admin/audit');
    return { ok: true };
  } catch (err) {
    console.error('[super-admin] saveAuditFilter failed', err);
    return { ok: false, message: err instanceof Error ? err.message : 'unknown_error' };
  }
}

export async function deleteAuditFilter(
  filterId: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await assertSuperAdmin();
    const meta = await reqMeta();
    await deleteSavedFilter({ id: filterId, ownerClerkId: ctx.user.clerkId });
    await withBypass((tx) =>
      tx.platformAuditLog.create({
        data: {
          actorClerkId: ctx.user.clerkId,
          action: 'audit.saved_filter_deleted',
          before: { id: filterId },
          after: Prisma.JsonNull,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    );
    revalidatePath('/super-admin/audit');
    return { ok: true };
  } catch (err) {
    console.error('[super-admin] deleteAuditFilter failed', err);
    return { ok: false, message: err instanceof Error ? err.message : 'unknown_error' };
  }
}
