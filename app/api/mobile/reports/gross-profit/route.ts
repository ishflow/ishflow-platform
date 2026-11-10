import { buildGrossProfit } from '@/lib/reports/gross-profit';
import { requireTenantContext } from '@/platform/auth/current-context';
import { hasFeature, minimumPlanFor } from '@/platform/billing/features';
import { withTenant } from '@/platform/db/tenant-context';
import { GrossProfitQuerySchema, GrossProfitResponseSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // gross-profit is an `advancedReports` feature — gate the mobile data route.
  if (!hasFeature(app.tenant, 'advancedReports')) {
    return NextResponse.json(
      { error: 'feature_locked', flag: 'advancedReports', upgradeTo: minimumPlanFor('advancedReports') },
      { status: 402 },
    );
  }

  const url = new URL(req.url);
  const parsed = GrossProfitQuerySchema.safeParse({
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid query' }, { status: 400 });
  }

  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: 'invalid range' }, { status: 400 });
  }

  const result = await withTenant(app.tenant.id, (tx) => buildGrossProfit(tx, from, to));
  const body = GrossProfitResponseSchema.parse(result);
  return NextResponse.json(body);
}
