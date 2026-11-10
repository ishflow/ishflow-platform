import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { requireTenantContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import { renderReport, type ReportFormat, type ReportType } from '@/lib/reports/exporters';
import { renderReportAsPDF } from '@/lib/reports/pdf-renderer';
import { computeSummary } from '@/lib/reports/summary';
import { type PeriodLabel } from '@/lib/reports/period';

export const dynamic = 'force-dynamic';

const SUPPORTED_TYPES: readonly ReportType[] = [
  'gross-profit',
  'ar-aging',
  'ap-aging',
  'sales-by-customer',
  'sales-by-product',
];

const QuerySchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf']),
  period: z.enum(['this-week', 'this-month', 'this-quarter', 'this-year']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  dims: z.string().optional(),
});

function titleForType(type: ReportType): string {
  switch (type) {
    case 'ar-aging':
      return 'Müşteri borçları (A/R Aging)';
    case 'ap-aging':
      return 'Tedarikçi borçları (A/P Aging)';
    case 'sales-by-customer':
      return 'Müşteriye göre satış';
    case 'sales-by-product':
      return 'Ürüne göre satış';
    case 'gross-profit':
      return 'Brüt kâr';
  }
}

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

  const { format, period, ...params } = parsed.data;

  if (format === 'pdf') {
    const label: PeriodLabel = period ?? 'this-month';
    const summary = await computeSummary(type as ReportType, label, ctx);
    const bytes = await renderReportAsPDF({
      tenantName: ctx.tenant?.name ?? 'Tenant',
      title: titleForType(type as ReportType),
      periodLabel: `${summary.period.from} — ${summary.period.to}`,
      currency: summary.currency,
      heroValue: summary.hero.value,
      heroDeltaPct: summary.hero.deltaPct,
      heroDeltaSign: summary.hero.deltaSign,
      headers: ['Etiket', 'Tutar', 'Detay'],
      rows: summary.breakdown.map((b) => [b.label, b.value, b.meta?.bucket ?? '']),
      totalLabel: 'Toplam',
      totalValue: summary.hero.value,
      generatedAt: new Date(),
    });
    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${type}-${label}.pdf"`,
      },
    });
  }

  const fromDate = params.from ? new Date(`${params.from}T00:00:00Z`) : undefined;
  const toDate = params.to ? new Date(`${params.to}T23:59:59.999Z`) : undefined;
  const result = await renderReport(
    type as ReportType,
    format as ReportFormat,
    {
      from: fromDate,
      to: toDate,
      dims: params.dims ? params.dims.split(',').filter(Boolean) : undefined,
    },
    ctx,
  );

  return new Response(Buffer.from(result.bytes), {
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
}
