import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { signGetUrl, deleteObject } from '@/lib/r2';
import { getParentDocStatus } from '@/platform/engine';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;

  const attachment = await withTenant(app.tenant.id, async (tx) =>
    tx.attachment.findFirst({
      where: {
        id,
        tenantId: app.tenant.id,
        deletedAt: null,
      },
    }),
  );

  if (!attachment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const downloadUrl = await signGetUrl(attachment.objectKey, {
    filename: attachment.filename,
    expiresSec: 3600,
  });

  return NextResponse.json({
    id: attachment.id,
    filename: attachment.filename,
    contentType: attachment.contentType,
    size: attachment.size,
    downloadUrl,
    createdAt: attachment.createdAt,
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;

  const attachment = await withTenant(app.tenant.id, async (tx) =>
    tx.attachment.findFirst({
      where: {
        id,
        tenantId: app.tenant.id,
        deletedAt: null,
      },
    }),
  );

  if (!attachment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const isAdmin = app.permissions.has('admin:*') || app.permissions.has('*:*');
  if (attachment.entity.startsWith('document.')) {
    const parentStatus = await withTenant(app.tenant.id, (tx) =>
      getParentDocStatus(tx, attachment.entity, attachment.entityId),
    );
    if (parentStatus === 'POSTED' && !isAdmin) {
      return NextResponse.json(
        { error: 'posted_doc_attachment_delete_forbidden' },
        { status: 403 },
      );
    }
  }

  await deleteObject(attachment.objectKey);

  await withTenant(app.tenant.id, async (tx) =>
    tx.attachment.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  );

  return new Response(null, { status: 204 });
}
