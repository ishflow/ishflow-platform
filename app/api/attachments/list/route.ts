import '@/configs';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { assertEntityAccess, listAttachments } from '@/platform/engine';
import { PermissionDeniedError } from '@/platform/engine/errors';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return new NextResponse('unauthorized', { status: 401 });
  }

  const url = new URL(req.url);
  const entity = url.searchParams.get('entity');
  const entityId = url.searchParams.get('entityId');
  if (!entity || !entityId) return new NextResponse('missing params', { status: 400 });

  try {
    assertEntityAccess(ctx, entity, 'read');
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return new NextResponse('forbidden', { status: 403 });
    }
    throw err;
  }

  const rows = await withTenant(ctx.tenant.id, (tx) =>
    listAttachments(tx, ctx.tenant.id, entity, entityId),
  );
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      contentType: r.contentType,
      size: r.size,
      uploadedBy: r.uploadedBy,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
