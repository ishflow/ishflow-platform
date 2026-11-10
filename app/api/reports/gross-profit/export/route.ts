import '@/configs';

import { renderReport } from '@/lib/reports/exporters';
import { requireTenantContext } from '@/platform/auth/current-context';
import { hasFeature, minimumPlanFor } from '@/platform/billing/features';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const querySchema = z.object({
  from: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : startOfMonthUtc(new Date()))),
  to: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(`${v}T23:59:59.999Z`) : new Date())),
  dims: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : [])),
});

export async function GET(req: Request): Promise<Response> {
  const tenantCtx = await requireTenantContext();

  // gross-profit is an `advancedReports` feature (the UI page is gated with
  // PlanFeatureGate). Gate the data/export route too so it can't be pulled
  // directly by a plan without the feature.
  if (!hasFeature(tenantCtx.tenant, 'advancedReports')) {
    return new Response(
      JSON.stringify({
        error: 'feature_locked',
        flag: 'advancedReports',
        upgradeTo: minimumPlanFor('advancedReports'),
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.parse({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    dims: searchParams.get('dims') ?? searchParams.get('groupBy') ?? undefined,
  });

  const filters: Record<string, unknown> = {};
  const allSupportedDims = ['counterparty', 'product', 'category', 'group'];
  for (const dim of allSupportedDims) {
    const fValue = searchParams.get(`f.${dim}`);
    const directValue = searchParams.get(dim);
    const rawValue = fValue ?? directValue;
    if (rawValue && rawValue.length > 0) {
      filters[dim] = rawValue.split(',').filter(Boolean);
    }
  }

  const result = await renderReport(
    'gross-profit',
    'csv',
    {
      from: parsed.from,
      to: parsed.to,
      dims: parsed.dims,
      ...filters,
    },
    tenantCtx,
  );

  return new Response(Buffer.from(result.bytes), {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
}
