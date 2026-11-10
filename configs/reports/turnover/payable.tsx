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
 * Turnover · Payable — A/P opening + charges + payments + closing per month,
 * driven by `movement_purchases_accounts_payable`.
 *
 * 12 monthly buckets ending at `period.end`. Breakdown table groups by
 * supplier with the same column set.
 */
export const turnoverPayableReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'turnover-payable',
    title: {
      en: 'Turnover · Payable',
      ru: 'Накопления · Кредиторка',
      tr: 'Ciro · Borçlar',
    },
    subtitleSecondary: {
      en: 'Turnover · Payables',
      ru: 'Накопления · Кредиторская задолженность',
      tr: 'Birikim · Borçlar',
    },
    breadcrumb: {
      en: 'Reports / Turnover / Payable',
      ru: 'Отчёты / Накопления / Кредиторка',
      tr: 'Raporlar / Ciro / Borçlar',
    },
    section: {
      en: 'Turnover',
      ru: 'Накопления',
      tr: 'Накопления (Ciro)',
    },
    hubCard: {
      icon: 'wallet-2',
      description: {
        en: 'Opening + new debt + payments + closing per month.',
        ru: 'Сальдо + начисления + оплаты + закрытие по месяцам.',
        tr: 'Açılış + yeni borç + ödemeler + kapanış (aylık).',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadTurnoverPayable,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

async function loadTurnoverPayable(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, period, tenant } = ctx;

  // 12 monthly buckets ending at period.end (exclusive).
  const buckets = buildMonthlyBuckets(period.end, 12);
  const firstStart = buckets[0]?.start ?? period.end;
  const lastEnd = buckets[buckets.length - 1]?.end ?? period.end;

  // ---------- All-time charges + payments before window for opening balance ----------
  const [openingAgg, windowMovements, suppliers] = await Promise.all([
    tx.movement_purchases_accounts_payable.groupBy({
      by: ['kind'],
      where: { active: true, timestamp: { lt: firstStart } },
      _sum: { amount: true },
    }),
    tx.movement_purchases_accounts_payable.findMany({
      where: {
        active: true,
        timestamp: { gte: firstStart, lt: lastEnd },
      },
      select: { kind: true, amount: true, timestamp: true, supplier: true },
    }),
    tx.catalog_purchases_supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
    }),
  ]);

  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  let opening = 0;
  // A/P movements use kind 'income' (a charge/supplier debt) and 'expense' (a
  // payment) — matching the posting engine (purchase-invoice.ts writes 'income',
  // payment-sent/bank-payment write 'expense'). NOT 'charge'/'payment'.
  for (const g of openingAgg) {
    const v = Number(g._sum.amount ?? 0);
    if (g.kind === 'income') opening += v;
    else if (g.kind === 'expense') opening -= v;
  }

  // Per-month and per-supplier-per-month aggregates
  type MonthAgg = { charges: number; payments: number };
  const monthly: MonthAgg[] = buckets.map(() => ({ charges: 0, payments: 0 }));
  type SupplierAgg = { charges: number; payments: number };
  const supplierAggs = new Map<string, SupplierAgg>();
  const supplierOpening = new Map<string, number>(); // pre-window net per supplier

  // Pre-window per supplier for opening column
  const supplierOpeningAgg = await tx.movement_purchases_accounts_payable.groupBy({
    by: ['supplier', 'kind'],
    where: { active: true, timestamp: { lt: firstStart } },
    _sum: { amount: true },
  });
  for (const g of supplierOpeningAgg) {
    const v = Number(g._sum.amount ?? 0);
    const cur = supplierOpening.get(g.supplier) ?? 0;
    supplierOpening.set(g.supplier, cur + (g.kind === 'income' ? v : -v));
  }

  for (const m of windowMovements) {
    const idx = findBucketIndex(buckets, m.timestamp);
    if (idx === -1) continue;
    const amount = Number(m.amount);
    const slot = monthly[idx];
    if (!slot) continue;
    const sup = supplierAggs.get(m.supplier) ?? { charges: 0, payments: 0 };
    if (m.kind === 'income') {
      slot.charges += amount;
      sup.charges += amount;
    } else if (m.kind === 'expense') {
      slot.payments += amount;
      sup.payments += amount;
    }
    supplierAggs.set(m.supplier, sup);
  }

  // Running closing balance per month (used for chart + KPIs)
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
      label: { en: 'New debt', ru: 'Начислено', tr: 'Yeni borç' },
      value: formatMoney(totalCharges, tenant.locale, tenant.currency),
    },
    {
      id: 'paid',
      label: { en: 'Paid', ru: 'Оплачено', tr: 'Ödendi' },
      value: formatMoney(totalPayments, tenant.locale, tenant.currency),
    },
    {
      id: 'closing',
      label: { en: 'Closing', ru: 'Закрытие', tr: 'Kapanış' },
      value: formatMoney(closing, tenant.locale, tenant.currency),
      tone: closing > opening ? 'negative' : closing < opening ? 'positive' : 'neutral',
    },
  ];

  // ---------- Chart: 12 monthly closing balances ----------
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

  // ---------- Breakdown: per supplier ----------
  type SupplierRow = {
    id: string;
    name: string;
    code: string;
    opening: number;
    charges: number;
    payments: number;
    closing: number;
  };
  const supplierRows: SupplierRow[] = [];
  const allSupplierIds = new Set<string>([...supplierOpening.keys(), ...supplierAggs.keys()]);
  for (const id of allSupplierIds) {
    const sup = supplierById.get(id);
    if (!sup) continue;
    const op = supplierOpening.get(id) ?? 0;
    const agg = supplierAggs.get(id) ?? { charges: 0, payments: 0 };
    const close = op + agg.charges - agg.payments;
    if (
      Math.abs(op) < 0.005 &&
      Math.abs(agg.charges) < 0.005 &&
      Math.abs(agg.payments) < 0.005 &&
      Math.abs(close) < 0.005
    ) {
      continue;
    }
    supplierRows.push({
      id,
      name: sup.name,
      code: sup.code,
      opening: op,
      charges: agg.charges,
      payments: agg.payments,
      closing: close,
    });
  }
  supplierRows.sort((a, b) => b.closing - a.closing);

  const breakdownRows: ReportBreakdownRow[] = supplierRows.map((r) => ({
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
        en: `${supplierRows.length} suppliers`,
        ru: `${supplierRows.length} поставщиков`,
        tr: `${supplierRows.length} tedarikçi`,
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
        title: { en: 'By Supplier', ru: 'По поставщикам', tr: 'Tedarikçi bazında' },
        dimensions: [
          { key: 'supplier', label: { en: 'Supplier', ru: 'Поставщик', tr: 'Tedarikçi' } },
          { key: 'month', label: { en: 'Month', ru: 'Месяц', tr: 'Ay' } },
        ],
        columns: [
          { key: 'name', label: { en: 'Supplier', ru: 'Поставщик', tr: 'Tedarikçi' } },
          {
            key: 'opening',
            label: { en: 'Opening', ru: 'Сальдо', tr: 'Açılış' },
            align: 'right',
          },
          {
            key: 'in',
            label: { en: 'New debt', ru: 'Начислено', tr: 'Yeni borç' },
            align: 'right',
          },
          {
            key: 'out',
            label: { en: 'Paid', ru: 'Оплачено', tr: 'Ödendi' },
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
  // endExclusive is the first instant *after* the latest month.
  // Last bucket = [start_of_last_month, end_of_last_month).
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
