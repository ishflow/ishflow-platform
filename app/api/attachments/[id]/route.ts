import '@/configs';
import { deleteObject } from '@/lib/r2';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { deleteAttachment, getAttachment, getParentDocStatus } from '@/platform/engine';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, ctxArg: { params: Promise<{ id: string }> }) {
  const { id } = await ctxArg.params;
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return new NextResponse('unauthorized', { status: 401 });
  }

  const row = await withTenant(ctx.tenant.id, (tx) => getAttachment(tx, ctx.tenant.id, id));
  if (!row) return new NextResponse('not found', { status: 404 });

  const isAdmin = ctx.permissions.has('admin:*') || ctx.permissions.has('*:*');

  if (row.entity.startsWith('document.')) {
    const parentStatus = await withTenant(ctx.tenant.id, (tx) =>
      getParentDocStatus(tx, row.entity, row.entityId),
    );
    if (parentStatus === 'POSTED' && !isAdmin) {
      return NextResponse.json(
        { error: 'posted_doc_attachment_delete_forbidden' },
        { status: 403 },
      );
    }
  }

  if (!isAdmin && row.uploadedBy !== ctx.user.id) {
    return new NextResponse('forbidden', { status: 403 });
  }

  await withTenant(ctx.tenant.id, (tx) => deleteAttachment(tx, ctx.tenant.id, id));
  try {
    await deleteObject(row.objectKey);
  } catch {
    // best-effort purge; soft-delete is source of truth.
  }
  return new NextResponse(null, { status: 204 });
}
