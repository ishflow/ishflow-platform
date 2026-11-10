import type { AppContext } from '@/platform/auth/current-context';
import {
  type ReportType,
  fetchAPAgingRows,
  fetchARAgingRows,
  fetchSalesByCustomerRows,
  fetchSalesByProductRows,
} from './exporters';
import { type PeriodLabel, resolvePeriod } from './period';

export interface ReportSummary {
  type: ReportType;
  period: { from: string; to: string; label: PeriodLabel };
  currency: string;
  hero: { value: number; deltaPct: number | null; deltaSign: 'up' | 'down' | 'flat' };
  breakdown: Array<{
    id: string;
    label: string;
    value: number;
    meta?: { bucket?: '0-30' | '31-60' | '61-90' | '90+'; count?: number };
  }>;
}

export async function computeSummary(
  type: ReportType,
  label: PeriodLabel,
  ctx: AppContext,
): Promise<ReportSummary> {
  const period = resolvePeriod(label);
  switch (type) {
    case 'ar-aging':
      return computeAgingSummary('ar-aging', period, ctx);
    case 'ap-aging':
      return computeAgingSummary('ap-aging', period, ctx);
    case 'sales-by-customer':
      return computeSalesFlowSummary('sales-by-customer', period, ctx);
    case 'sales-by-product':
      return computeSalesFlowSummary('sales-by-product', period, ctx);
    case 'gross-profit':
      return computeGrossProfitSummary(period, ctx);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

// Implementations added in subsequent tasks (6, 7).
async function computeAgingSummary(
  type: 'ar-aging' | 'ap-aging',
  period: ReturnType<typeof resolvePeriod>,
  ctx: AppContext,
): Promise<ReportSummary> {
  if (!ctx.tenant) throw new Error('Tenant context required');
  const fetcher = type === 'ar-aging' ? fetchARAgingRows : fetchAPAgingRows;
  const data = await fetcher({ to: period.to }, ctx);

  type Row = {
    id: string;
    label: string;
    total: number;
    bucket: '0-30' | '31-60' | '61-90' | '90+';
  };

  const typed: Row[] = data.rows.map((r, i) => {
    const cells = r as unknown[];
    const label = String(cells[0] ?? '');
    const total = Number(cells[1] ?? 0);
    const b31_60 = Number(cells[3] ?? 0);
    const b61_90 = Number(cells[4] ?? 0);
    // Spec uses 4 buckets; exporter splits 90+ into 91-120 + 120+. Merge.
    const b90plus = Number(cells[5] ?? 0) + Number(cells[6] ?? 0);

    let bucket: Row['bucket'] = '0-30';
    if (b90plus > 0) bucket = '90+';
    else if (b61_90 > 0) bucket = '61-90';
    else if (b31_60 > 0) bucket = '31-60';

    return { id: `${label}-${i}`, label, total, bucket };
  });

  const heroValue = typed.reduce((sum, r) => sum + r.total, 0);

  return {
    type,
    period: {
      from: period.from.toISOString().slice(0, 10),
      to: period.to.toISOString().slice(0, 10),
      label: period.label,
    },
    currency: ctx.tenant.currency ?? 'USD',
    hero: { value: heroValue, deltaPct: null, deltaSign: 'flat' },
    breakdown: typed.slice(0, 10).map((r) => ({
      id: r.id,
      label: r.label,
      value: r.total,
      meta: { bucket: r.bucket },
    })),
  };
}

async function computeSalesFlowSummary(
  type: 'sales-by-customer' | 'sales-by-product',
  period: ReturnType<typeof resolvePeriod>,
  ctx: AppContext,
): Promise<ReportSummary> {
  if (!ctx.tenant) throw new Error('Tenant context required');
  const fetcher = type === 'sales-by-customer' ? fetchSalesByCustomerRows : fetchSalesByProductRows;

  const cur = await fetcher({ from: period.from, to: period.to }, ctx);
  const prev = await fetcher({ from: period.priorFrom, to: period.priorTo }, ctx);

  // Row shape: [name, revenue, cost, margin, marginPct, quantity]
  const curItems = cur.rows.map((r, i) => {
    const cells = r as unknown[];
    return {
      id: `${String(cells[0] ?? '')}-${i}`,
      label: String(cells[0] ?? ''),
      value: Number(cells[1] ?? 0),
    };
  });

  const heroValue = curItems.reduce((s, r) => s + r.value, 0);
  const prevHero = prev.rows.reduce((s, r) => s + Number((r as unknown[])[1] ?? 0), 0);

  const deltaPct = prevHero === 0 ? null : ((heroValue - prevHero) / prevHero) * 100;
  const deltaSign: 'up' | 'down' | 'flat' =
    deltaPct === null ? 'flat' : deltaPct > 0.5 ? 'up' : deltaPct < -0.5 ? 'down' : 'flat';

  return {
    type,
    period: {
      from: period.from.toISOString().slice(0, 10),
      to: period.to.toISOString().slice(0, 10),
      label: period.label,
    },
    currency: ctx.tenant.currency ?? 'USD',
    hero: { value: heroValue, deltaPct, deltaSign },
    breakdown: curItems.slice(0, 10),
  };
}

async function computeGrossProfitSummary(
  period: ReturnType<typeof resolvePeriod>,
  ctx: AppContext,
): Promise<ReportSummary> {
  if (!ctx.tenant) throw new Error('Tenant context required');

  const cur = await fetchSalesByCustomerRows({ from: period.from, to: period.to }, ctx);
  const prev = await fetchSalesByCustomerRows({ from: period.priorFrom, to: period.priorTo }, ctx);

  // Row shape: [name, revenue, cost, margin, marginPct, quantity] — cells[3] = margin (gross profit)
  const curItems = cur.rows.map((r, i) => {
    const cells = r as unknown[];
    return {
      id: `${String(cells[0] ?? '')}-${i}`,
      label: String(cells[0] ?? ''),
      value: Number(cells[3] ?? 0),
    };
  });

  const heroValue = curItems.reduce((s, r) => s + r.value, 0);
  const prevHero = prev.rows.reduce((s, r) => s + Number((r as unknown[])[3] ?? 0), 0);

  const deltaPct = prevHero === 0 ? null : ((heroValue - prevHero) / prevHero) * 100;
  const deltaSign: 'up' | 'down' | 'flat' =
    deltaPct === null ? 'flat' : deltaPct > 0.5 ? 'up' : deltaPct < -0.5 ? 'down' : 'flat';

  return {
    type: 'gross-profit',
    period: {
      from: period.from.toISOString().slice(0, 10),
      to: period.to.toISOString().slice(0, 10),
      label: period.label,
    },
    currency: ctx.tenant.currency ?? 'USD',
    hero: { value: heroValue, deltaPct, deltaSign },
    breakdown: curItems.sort((a, b) => b.value - a.value).slice(0, 10),
  };
}
