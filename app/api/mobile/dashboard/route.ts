import { resolveContext } from '@/platform/auth/current-context';
import { buildDashboardLayout } from '@/lib/mobile/dashboard-layout';
import { DashboardResponseSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!ctx.tenant) {
    return NextResponse.json({ tenant: null, layout: [] }, { status: 200 });
  }

  const layout = await buildDashboardLayout(ctx);

  const body = DashboardResponseSchema.parse({
    tenant: { id: ctx.tenant.id, currency: ctx.tenant.currency },
    layout,
  });

  return NextResponse.json(body);
}
