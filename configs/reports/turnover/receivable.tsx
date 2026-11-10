import { formatMoney } from '@/lib/format-money';
import {
  type Locale,
  type LocalizedLabel,
  type ReportBreakdownRow,
  type ReportChartSection,
  type ReportKpiCard,
  type ReportViewConfig,
  type ReportViewPayload,
  defineReportView,
} from '@/platform/metadata';

/**
 * Turnover · Receivable — A/R opening + inflow charges + collected payments
 * + closing per month, driven by `movement_sales_accounts_receivable`.
 *
 * 12 monthly buckets ending at `period.end`. Breakdown groups by customer.
 */
export const turnoverReceivableReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'turnover-receivable',
    title: {
      en: 'Turnover · Receivable',
      ru: 'Накопления · Дебиторка',
      tr: 'Ciro · Alacaklar',
    },
    subtitleSecondary: {
      en: 'Turnover · Receivables',
      ru: 'Накопления · Дебиторская задолженность',
      tr: 'Birikim · Alacaklar',
    },
    breadcrumb: {
      en: 'Reports / Turnover / Receivable',
      ru: 'Отчёты / Накопления / Дебиторка',
      tr: 'Raporlar / Ciro / Alacaklar',
    },
    section: {
      en: 'Turnover',
      ru: 'Накопления',
      tr: 'Накопления (Ciro)',
    },
    hubCard: {
      icon: 'wallet',
      description: {
        en: 'Opening + new receivables + collected + closing per month.',
        ru: 'Сальдо + начисления + поступления + закрытие по месяцам.',
        tr: 'Açılış + yeni alacak + tahsilat + kapanış (aylık).',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadTurnoverReceivable,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

async function loadTurnoverReceivable(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, period, tenant } = ctx;

  const buckets = buildMonthlyBuckets(period.end, 12);
  const firstStart = buckets[0]?.start ?? period.end;
  const lastEnd = buckets[buckets.length - 1]?.end ?? period.end;

  const [openingAgg, windowMovements, customers, customerOpeningAgg] = await Promise.all([
    tx.movement_sales_accounts_receivable.groupBy({
      by: ['kind'],
      where: { active: true, timestamp: { lt: firstStart } },
      _sum: { amount: true },
    }),
    tx.movement_sales_accounts_receivable.findMany({
      where: {
        active: true,
        timestamp: { gte: firstStart, lt: lastEnd },
      },
      select: { kind: true, amount: true, timestamp: true, customer: true },
    }),
    tx.catalog_sales_customer.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
    }),
    tx.movement_sales_accounts_receivable.groupBy({
      by: ['customer', 'kind'],
      where: { active: true, timestamp: { lt: firstStart } },
      _sum: { amount: true },
    }),
  ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));

  let opening = 0;
  // A/R movements are written with kind 'income' (a charge/invoice) and
  // 'expense' (a collected payment) — NOT 'charge'/'payment'. See
  // configs/sales/documents/sales-invoice.ts + lib/reports/ar-aging.ts.
  for (const g of openingAgg) {
    const v = Number(g._sum.amount ?? 0);
    if (g.kind === 'income') opening += v;
    else if (g.kind === 'expense') opening -= v;
  }

  const customerOpening = new Map<string, number>();
  for (const g of customerOpeningAgg) {
    const v = Number(g._sum.amount ?? 0);
    const cur = customerOpening.get(g.customer) ?? 0;
    customerOpening.set(g.customer, cur + (g.kind === 'income' ? v : -v));
  }

  type MonthAgg = { charges: number; payments: number };
  const monthly: MonthAgg[] = buckets.map(() => ({ charges: 0, payments: 0 }));
  type CustomerAgg = { charges: number; payments: number };
  const customerAggs = new Map<string, CustomerAgg>();

  for (const m of windowMovements) {
    const idx = findBucketIndex(buckets, m.timestamp);
    if (idx === -1) continue;
    const amount = Number(m.amount);
    const slot = monthly[idx];
    if (!slot) continue;
    const cust = customerAggs.get(m.customer) ?? { charges: 0, payments: 0 };
    if (m.kind === 'income') {
      slot.charges += amount;
      cust.charges += amount;
    } else if (m.kind === 'expense') {
      slot.payments += amount;
      cust.payments += amount;
    }
    customerAggs.set(m.customer, cust);
  }

  let running = opening;
  const closings: number[] = monthly.map((m) => {
    running = running + m.charges - m.payments;
    return running;
  });

  const totalCharges = monthly.reduce((s, m) => s + m.charges, 0);
  const totalPayments = monthly.reduce((s, m) => s + m.payments, 0);
  const closing = closings[closings.length - 1] ?? opening;

  const kpis: ReportKpiCard[] = [
    {
      id: 'opening',
      label: { en: 'Opening', ru: 'Сальдо', tr: 'Açılış' },
      value: formatMoney(opening, tenant.locale, tenant.currency),
    },
    {
      id: 'added',
      label: { en: 'New receivables', ru: 'Начислено', tr: 'Yeni alacak' },
      value: formatMoney(totalCharges, tenant.locale, tenant.currency),
    },
    {
      id: 'collected',
      label: { en: 'Collected', ru: 'Поступления', tr: 'Tahsil edildi' },
      value: formatMoney(totalPayments, tenant.locale, tenant.currency),
    },
    {
      id: 'closing',
      label: { en: 'Closing', ru: 'Закрытие', tr: 'Kapanış' },
      value: formatMoney(closing, tenant.locale, tenant.currency),
      tone: closing < opening ? 'positive' : closing > opening ? 'negative' : 'neutral',
    },
  ];

  const first = closings[0] ?? 0;
  const last = closings[closings.length - 1] ?? first;
  const changePct = Math.abs(first) > 0.005 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const monthFmt = new Intl.DateTimeFormat(tenant.locale, { month: 'short', timeZone: 'UTC' });

  const chart: ReportChartSection = {
    kind: 'chart',
    totalLabel: formatMoney(last, tenant.locale, tenant.currency),
    changePct,
    points: closings,
    labels: buckets.map((b) => monthFmt.format(b.start)),
  };

  type CustomerRow = {
    id: string;
    name: string;
    code: string;
    opening: number;
    charges: number;
    payments: number;
    closing: number;
  };
  const customerRows: CustomerRow[] = [];
  const allIds = new Set<string>([...customerOpening.keys(), ...customerAggs.keys()]);
  for (const id of allIds) {
    const cust = customerById.get(id);
    if (!cust) continue;
    const op = customerOpening.get(id) ?? 0;
    const agg = customerAggs.get(id) ?? { charges: 0, payments: 0 };
    const close = op + agg.charges - agg.payments;
    if (
      Math.abs(op) < 0.005 &&
      Math.abs(agg.charges) < 0.005 &&
      Math.abs(agg.payments) < 0.005 &&
      Math.abs(close) < 0.005
    ) {
      continue;
    }
    customerRows.push({
      id,
      name: cust.name,
      code: cust.code,
      opening: op,
      charges: agg.charges,
      payments: agg.payments,
      closing: close,
    });
  }
  customerRows.sort((a, b) => b.closing - a.closing);

  const breakdownRows: ReportBreakdownRow[] = customerRows.map((r) => ({
    id: r.id,
    cells: [
      <span key="n">
        <div className="row-title">{r.name}</div>
        <div className="row-sub">{r.code}</div>
      </span>,
      formatMoney(r.opening, tenant.locale, tenant.currency),
      `+${formatMoney(r.charges, tenant.locale, tenant.currency)}`,
      `−${formatMoney(r.payments, tenant.locale, tenant.currency)}`,
      <b key="c">{formatMoney(r.closing, tenant.locale, tenant.currency)}</b>,
    ],
  }));

  const totalsRow = [
    pickLabel(
      {
        en: `${customerRows.length} customers`,
        ru: `${customerRows.length} клиентов`,
        tr: `${customerRows.length} müşteri`,
      },
      tenant.locale,
    ),
    formatMoney(opening, tenant.locale, tenant.currency),
    `+${formatMoney(totalCharges, tenant.locale, tenant.currency)}`,
    `−${formatMoney(totalPayments, tenant.locale, tenant.currency)}`,
    formatMoney(closing, tenant.locale, tenant.currency),
  ];

  return {
    kpis,
    sections: [
      chart,
      {
        kind: 'breakdown',
        title: { en: 'By Customer', ru: 'По клиентам', tr: 'Müşteri bazında' },
        dimensions: [
          { key: 'customer', label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' } },
          { key: 'month', label: { en: 'Month', ru: 'Месяц', tr: 'Ay' } },
        ],
        columns: [
          { key: 'name', label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' } },
          {
            key: 'opening',
            label: { en: 'Opening', ru: 'Сальдо', tr: 'Açılış' },
            align: 'right',
          },
          {
            key: 'in',
            label: { en: 'Inflow', ru: 'Начислено', tr: 'Yeni alacak' },
            align: 'right',
          },
          {
            key: 'out',
            label: { en: 'Collected', ru: 'Поступления', tr: 'Tahsil edildi' },
            align: 'right',
          },
          {
            key: 'closing',
            label: { en: 'Closing', ru: 'Закрытие', tr: 'Kapanış' },
            align: 'right',
          },
        ],
        rows: breakdownRows,
        totalsRow,
      },
    ],
  };
}

// ─────────────────────────── helpers ───────────────────────────

type MonthBucket = { start: Date; end: Date };

function buildMonthlyBuckets(endExclusive: Date, count: number): MonthBucket[] {
  const lastMonthStart = new Date(
    Date.UTC(endExclusive.getUTCFullYear(), endExclusive.getUTCMonth() - 1, 1),
  );
  const out: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(
      Date.UTC(lastMonthStart.getUTCFullYear(), lastMonthStart.getUTCMonth() - i, 1),
    );
    const end = new Date(
      Date.UTC(lastMonthStart.getUTCFullYear(), lastMonthStart.getUTCMonth() - i + 1, 1),
    );
    out.push({ start, end });
  }
  return out;
}

function findBucketIndex(buckets: MonthBucket[], ts: Date): number {
  const t = ts.getTime();
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    if (!b) continue;
    if (t >= b.start.getTime() && t < b.end.getTime()) return i;
  }
  return -1;
}
