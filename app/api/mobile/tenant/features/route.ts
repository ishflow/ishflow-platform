import { requireTenantContext } from '@/platform/auth/current-context';
import { DEFAULT_MOBILE_FEATURES, MobileFeaturesSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const stored = (ctx.tenant as unknown as { mobileFeatures?: Record<string, boolean> })
    .mobileFeatures;
  const merged = { ...DEFAULT_MOBILE_FEATURES, ...(stored ?? {}) };
  const body = MobileFeaturesSchema.parse(merged);
  return NextResponse.json(body);
}
