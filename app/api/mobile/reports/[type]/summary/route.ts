import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { requireTenantContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import { computeSummary } from '@/lib/reports/summary';
import type { ReportType } from '@/lib/reports/exporters';

export const dynamic = 'force-dynamic';

const SUPPORTED_TYPES: readonly ReportType[] = [
  'gross-profit',
  'ar-aging',
  'ap-aging',
  'sales-by-customer',
  'sales-by-product',
];

const QuerySchema = z.object({
  period: z.enum(['this-week', 'this-month', 'this-quarter', 'this-year']),
});

export async function GET(req: NextRequest, ctxArg: { params: Promise<{ type: string }> }) {
  const { type } = await ctxArg.params;
  if (!SUPPORTED_TYPES.includes(type as ReportType)) {
    return new Response('not found', { status: 404 });
  }

  let ctx;
  try {
    ctx = await requireTenantContext();
  } catch {
    return new Response('unauthorized', { status: 401 });
  }

  if (!hasPermission(ctx.permissions, 'reports:read')) {
    return new Response('forbidden', { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return new Response('invalid query', { status: 400 });

  const summary = await computeSummary(type as ReportType, parsed.data.period, ctx);
  return Response.json(summary);
}
