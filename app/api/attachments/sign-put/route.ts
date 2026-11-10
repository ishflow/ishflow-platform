import '@/configs';
import { randomUUID } from 'node:crypto';
import { buildObjectKey, signPutUrl } from '@/lib/r2';
import { requireTenantContext } from '@/platform/auth/current-context';
import { enforcePlanLimit } from '@/platform/billing/enforce';
import { withTenant } from '@/platform/db/tenant-context';
import { assertEntityAccess, createAttachment } from '@/platform/engine';
import { PermissionDeniedError, PlanLimitError } from '@/platform/engine/errors';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  entity: z.string().regex(/^(document|catalog)\.[a-z0-9_]+\.[a-z0-9_]+$/),
  entityId: z.string().uuid(),
  filename: z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/)
    .max(120),
  displayName: z.string().min(1).max(255).optional(),
  contentType: z.string().max(128),
  size: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
});

export async function POST(req: Request) {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return new NextResponse('unauthorized', { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { entity, entityId, filename, displayName, contentType, size } = parsed.data;

  try {
    assertEntityAccess(ctx, entity, 'write');
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return new NextResponse('forbidden', { status: 403 });
    }
    throw err;
  }

  // Plan-limit guard. With MODE=on, throws PlanLimitError when the projected
  // storageBytes (current + size) would exceed the tenant's effective ceiling;
  // map to 402 so the client can render an upgrade CTA.
  try {
    await enforcePlanLimit(ctx.tenant, { kind: 'upload_attachment', addBytes: size });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json(err.toJSON(), { status: 402 });
    }
    throw err;
  }

  const attachmentId = randomUUID();
  const objectKey = buildObjectKey(ctx.tenant.id, entityId, attachmentId, filename);

  const row = await withTenant(ctx.tenant.id, (tx) =>
    createAttachment(tx, {
      tenantId: ctx.tenant.id,
      entity,
      entityId,
      filename: displayName ?? filename,
      contentType,
      size,
      objectKey,
      uploadedBy: ctx.user.id,
    }),
  );

  const putUrl = await signPutUrl(objectKey, contentType, size);

  return NextResponse.json({ attachmentId: row.id, putUrl });
}
