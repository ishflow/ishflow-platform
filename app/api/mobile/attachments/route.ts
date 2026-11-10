// Side-effect import: populates the metadata registry so `assertEntityAccess`
// can resolve `entity` strings. See app/api/mobile/attachments/upload/route.ts
// for the incident context.
import '@/configs';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { signGetUrl } from '@/lib/r2';
import { assertEntityAccess } from '@/platform/engine/attachments';
import { PermissionDeniedError } from '@/platform/engine/errors';
import { AttachmentListQuerySchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = AttachmentListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid query' }, { status: 400 });
  }
  const { entity, entityId } = parsed.data;

  try {
    assertEntityAccess(app, entity, 'read');
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    throw err;
  }

  const rows = await withTenant(app.tenant.id, async (tx) =>
    tx.attachment.findMany({
      where: { tenantId: app.tenant.id, entity, entityId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
  );

  const items = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      filename: r.filename,
      contentType: r.contentType,
      size: r.size,
      downloadUrl: await signGetUrl(r.objectKey, { filename: r.filename, expiresSec: 3600 }),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    })),
  );

  return NextResponse.json({ items });
}
