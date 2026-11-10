import { requireTenantContext } from '@/platform/auth/current-context';
import { requireBranding } from '@/platform/billing/branding-gate';
import { PlanFeatureError } from '@/platform/billing/features';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HSL_REGEX = /^\d+\s+\d+%\s+\d+%$/;

export async function PUT(req: Request): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasPermission(ctx.permissions, 'owner:branding')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    requireBranding(ctx.tenant);
  } catch (e) {
    if (e instanceof PlanFeatureError) return NextResponse.json(e.toJSON(), { status: 402 });
    throw e;
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const logoUrl =
    body.logoUrl === null ? null : typeof body.logoUrl === 'string' ? body.logoUrl : undefined;
  const brandColor =
    body.brandColor === null
      ? null
      : typeof body.brandColor === 'string'
        ? body.brandColor
        : undefined;

  if (brandColor !== null && brandColor !== undefined && !HSL_REGEX.test(brandColor)) {
    return NextResponse.json(
      { error: 'invalid_hsl', message: 'Brand color must be HSL format' },
      { status: 400 },
    );
  }

  await withTenant(ctx.tenant.id, async (tx) => {
    await tx.tenant.update({
      where: { id: ctx.tenant.id },
      data: {
        ...(logoUrl !== undefined && { logoUrl }),
        ...(brandColor !== undefined && { brandColor }),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        entity: 'tenant',
        entityId: ctx.tenant.id,
        action: 'update',
        after: {
          logoUrl: logoUrl ?? null,
          brandColor: brandColor ?? null,
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
