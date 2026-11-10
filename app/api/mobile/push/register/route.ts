import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { resolveIdempotency, storeIdempotency } from '@/platform/engine';
import {
  PushRegisterRequestSchema,
  PushRegisterResponseSchema,
  PushUnregisterRequestSchema,
} from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const raw = (await req.json()) as unknown;
  const parsed = PushRegisterRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { token, platform, deviceName, tokenKind } = parsed.data;

  if (tokenKind === 'apns' && !/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json(
      { error: 'invalid apns token format' },
      { status: 400 },
    );
  }

  const idempotencyKey = req.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Idempotency-Key header required' }, { status: 400 });
  }
  const existing = await resolveIdempotency(ctx.tenant.id, idempotencyKey).catch(() => null);
  if (existing && existing.resourceType === 'push.register') {
    return NextResponse.json(existing.responseBody, { status: existing.statusCode });
  }

  await withTenant(ctx.tenant.id, async (tx) => {
    await (
      tx as unknown as {
        devicePushToken: {
          upsert: (a: unknown) => Promise<unknown>;
        };
      }
    ).devicePushToken.upsert({
      where: { token },
      create: {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        token,
        platform,
        deviceName: deviceName ?? null,
      },
      update: {
        userId: ctx.user.id,
        platform,
        deviceName: deviceName ?? null,
        lastUsedAt: new Date(),
      },
    });
  });

  const body = PushRegisterResponseSchema.parse({ ok: true });
  await storeIdempotency(ctx.tenant.id, idempotencyKey, {
    resourceType: 'push.register',
    resourceId: token,
    responseBody: body,
    statusCode: 200,
  });
  return NextResponse.json(body);
}

export async function DELETE(req: Request): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const raw = (await req.json()) as unknown;
  const parsed = PushUnregisterRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  await withTenant(ctx.tenant.id, async (tx) => {
    await (
      tx as unknown as {
        devicePushToken: {
          deleteMany: (a: unknown) => Promise<unknown>;
        };
      }
    ).devicePushToken.deleteMany({
      where: { tenantId: ctx.tenant.id, token: parsed.data.token },
    });
  });

  return NextResponse.json({ ok: true });
}
