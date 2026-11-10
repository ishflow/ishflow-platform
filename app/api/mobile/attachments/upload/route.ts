// Side-effect import: populates the metadata registry so `assertEntityAccess`
// can resolve `entity` strings like `document.purchases.invoice`. Without
// this, the registry is empty on serverless cold starts and the call falls
// through to PermissionDeniedError → an opaque 403 — see incident 2026-05-16.
import '@/configs';
import { requireTenantContext } from '@/platform/auth/current-context';
import { enforcePlanLimit } from '@/platform/billing/enforce';
import { withTenant } from '@/platform/db/tenant-context';
import { buildObjectKey, signPutUrl, signGetUrl } from '@/lib/r2';
import { assertEntityAccess } from '@/platform/engine/attachments';
import { PermissionDeniedError, PlanLimitError } from '@/platform/engine/errors';
import { AttachmentUploadRequestSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = AttachmentUploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body', details: parsed.error.format() }, { status: 400 });
  }

  const { fileName, mimeType, size, entity, entityId } = parsed.data;

  try {
    assertEntityAccess(app, entity, 'write');
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    throw err;
  }

  // Plan-limit guard. With MODE=on, throws PlanLimitError when the projected
  // storageBytes (current + size) would exceed the tenant's effective ceiling.
  try {
    await enforcePlanLimit(app.tenant, { kind: 'upload_attachment', addBytes: size });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json(err.toJSON(), { status: 402 });
    }
    throw err;
  }

  const attachmentId = randomUUID();
  const objectKey = buildObjectKey(app.tenant.id, entityId, attachmentId, fileName);

  const uploadUrl = await signPutUrl(objectKey, mimeType, size);
  const downloadUrl = await signGetUrl(objectKey, { filename: fileName, expiresSec: 3600 });

  await withTenant(app.tenant.id, async (tx) =>
    tx.attachment.create({
      data: {
        id: attachmentId,
        tenantId: app.tenant.id,
        entity,
        entityId,
        filename: fileName,
        contentType: mimeType,
        size,
        objectKey,
        uploadedBy: app.user.id,
      },
    }),
  );

  return NextResponse.json({
    attachmentId,
    uploadUrl,
    downloadUrl,
  });
}
