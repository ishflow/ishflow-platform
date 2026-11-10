import { requireContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RESTORE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireContext>>;
  try {
    ctx = await requireContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!ctx.tenant) {
    return NextResponse.json({ error: 'no_tenant' }, { status: 400 });
  }

  if (!hasPermission(ctx.permissions, 'owner:tenant_archive')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Caller must be the one who archived it
  if (ctx.tenant.archivedBy !== ctx.user.id) {
    return NextResponse.json({ error: 'not_archived_by_you' }, { status: 403 });
  }

  if (!ctx.tenant.deletedAt) {
    return NextResponse.json({ error: 'not_archived' }, { status: 400 });
  }

  const archivedAt = new Date(ctx.tenant.deletedAt);
  const now = new Date();
  if (now.getTime() - archivedAt.getTime() > RESTORE_WINDOW_MS) {
    return NextResponse.json({ error: 'restore_window_expired' }, { status: 410 });
  }

  const tenantId = ctx.tenant.id;
  const userId = ctx.user.id;

  await withTenant(tenantId, async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { deletedAt: null, archivedBy: null },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        entity: 'tenant',
        entityId: tenantId,
        action: 'restore',
        before: { deletedAt: archivedAt.toISOString(), archivedBy: userId },
        after: { deletedAt: null, archivedBy: null },
      },
    });
  });

  return NextResponse.json({ ok: true, restoredAt: now.toISOString() });
}
