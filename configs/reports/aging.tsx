import { formatMoney } from '@/lib/format-money';
import {
  type Locale,
  type LocalizedLabel,
  type ReportAgingBucket,
  type ReportBreakdownRow,
  type ReportKpiCard,
  type ReportViewConfig,
  type ReportViewPayload,
  defineReportView,
} from '@/platform/metadata';

/**
 * Aging report — A/R buckets by days-overdue + per-customer breakdown.
 *
 * Buckets: current (0–30), late1 (31–60), late2 (61–90), late3 (91–120),
 * late4 (120+). Charges count as "overdue days" = today − timestamp. We
 * treat payments as offsetting the OLDEST charges first (FIFO) before
 * bucketing the remaining balance. Customers with zero net balance are
 * dropped from the breakdown.
 */
export const agingReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'aging',
    title: {
      en: 'A/R Aging',
      ru: 'Возрастная структура',
      tr: 'Yaşlandırma',
    },
    subtitleSecondary: {
      en: 'Aging · A/R',
      ru: 'Возрастная структура · A/R',
      tr: 'Yaşlandırma · A/R',
    },
    countLabel: (n) => ({
      en: `${n} customers`,
      ru: `${n} клиентов`,
      tr: `${n} müşteri`,
    }),
    breadcrumb: {
      en: 'Reports / A/R Aging',
      ru: 'Отчёты / Возрастная структура',
      tr: 'Raporlar / Yaşlandırma',
    },
    section: {
      en: 'Operational',
      ru: 'Оперативные',
      tr: 'Operasyonel',
    },
    hubCard: {
      icon: 'alert-triangle',
      description: {
        en: 'Open invoices bucketed by days overdue.',
        ru: 'Открытые счета по периодам просрочки.',
        tr: 'Açık faturalar gecikme dönemine göre kümelenmiş.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadAging,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

const BUCKETS = [
  { key: 'current', maxDays: 30, tone: 'ok' as const },
  { key: 'late1', maxDays: 60, tone: 'ok' as const },
  { key: 'late2', maxDays: 90, tone: 'warn' as const },
  { key: 'late3', maxDays: 120, tone: 'warn' as const },
  { key: 'late4', maxDays: Number.POSITIVE_INFINITY, tone: 'danger' as const },
];

const BUCKET_LABELS: Record<string, LocalizedLabel> = {
  current: { en: 'Current 0–30g', ru: '0–30 дн', tr: 'Cari 0–30g' },
  late1: { en: '31–60g late', ru: '31–60 дн', tr: '31–60g geç' },
  late2: { en: '61–90g late', ru: '61–90 дн', tr: '61–90g geç' },
  late3: { en: '91–120g late', ru: '91–120 дн', tr: '91–120g geç' },
  late4: { en: '120g+ risky', ru: '120+ дн', tr: '120g+ riskli' },
};

const BUCKET_SHORT: Record<string, LocalizedLabel> = {
  current: { en: 'Curr.', ru: 'Тек.', tr: 'Cari' },
  late1: { en: '1–30g', ru: '1–30 д', tr: '1–30g' },
  late2: { en: '31–60g', ru: '31–60 д', tr: '31–60g' },
  late3: { en: '61–90g', ru: '61–90 д', tr: '61–90g' },
  late4: { en: '90+g', ru: '90+ д', tr: '90+g' },
};

async function loadAging(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx } = ctx;
  const asOf = ctx.period.end;

  const [movements, customers] = await Promise.all([
    tx.movement_sales_accounts_receivable.findMany({
      where: { active: true, timestamp: { lte: asOf } },
      orderBy: [{ timestamp: 'asc' }],
      select: { id: true, customer: true, kind: true, amount: true, timestamp: true },
    }),
    tx.catalog_sales_customer.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true },
    }),
  ]);

  const customerById = new Map(customers.map((c) => [c.id, c]));

  // Per customer: FIFO-offset charges by payments, then bucketize remaining
  // open charges by (asOf - timestamp) days.
  type OpenCharge = { amount: number; timestamp: Date };
  const chargesByCustomer = new Map<string, OpenCharge[]>();
  // A/R movement kinds are 'income' (charge/invoice) and 'expense' (payment),
  // matching the posting engine + lib/reports/ar-aging.ts — not 'charge'/'payment'.
  for (const m of movements) {
    if (m.kind === 'income') {
      const list = chargesByCustomer.get(m.customer) ?? [];
      list.push({ amount: Number(m.amount), timestamp: m.timestamp });
      chargesByCustomer.set(m.customer, list);
    }
  }
  // Apply payments FIFO
  const paymentTotal = new Map<string, number>();
  for (const m of movements) {
    if (m.kind === 'expense') {
      paymentTotal.set(m.customer, (paymentTotal.get(m.customer) ?? 0) + Number(m.amount));
    }
  }
  for (const [custId, charges] of chargesByCustomer) {
    let rem = paymentTotal.get(custId) ?? 0;
    for (const ch of charges) {
      if (rem <= 0) break;
      const offset = Math.min(rem, ch.amount);
      ch.amount -= offset;
      rem -= offset;
    }
  }

  // Bucketize per customer
  type CustomerAging = {
    id: string;
    name: string;
    code: string;
    perBucket: Record<string, number>;
    total: number;
  };
  const customersAging: CustomerAging[] = [];
  for (const [custId, charges] of chargesByCustomer) {
    const cust = customerById.get(custId);
    if (!cust) continue;
    const perBucket: Record<string, number> = {
      current: 0,
      late1: 0,
      late2: 0,
      late3: 0,
      late4: 0,
    };
    for (const ch of charges) {
      if (ch.amount <= 0.005) continue;
      const days = Math.floor((asOf.getTime() - ch.timestamp.getTime()) / (24 * 60 * 60 * 1000));
      const b = BUCKETS.find((bb) => days <= bb.maxDays);
      if (b) perBucket[b.key] = (perBucket[b.key] ?? 0) + ch.amount;
    }
    const total = Object.values(perBucket).reduce((a, b) => a + b, 0);
    if (total <= 0.005) continue;
    customersAging.push({ id: custId, name: cust.name, code: cust.code, perBucket, total });
  }
  customersAging.sort((a, b) => b.total - a.total);

  // ---------- KPIs (4 cards: total open, customers count, oldest days, risk %) ----------
  const totalOpen = customersAging.reduce((s, c) => s + c.total, 0);
  const totalRisk = customersAging.reduce(
    (s, c) => s + (c.perBucket.late3 ?? 0) + (c.perBucket.late4 ?? 0),
    0,
  );
  const riskPct = totalOpen > 0 ? (totalRisk / totalOpen) * 100 : 0;
  const oldestDays = (() => {
    let max = 0;
    for (const c of customersAging) {
      for (const ch of chargesByCustomer.get(c.id) ?? []) {
        if (ch.amount <= 0.005) continue;
        const d = Math.floor((asOf.getTime() - ch.timestamp.getTime()) / (24 * 60 * 60 * 1000));
        if (d > max) max = d;
      }
    }
    return max;
  })();

  const kpis: ReportKpiCard[] = [
    {
      id: 'totalOpen',
      label: { en: 'Total Open A/R', ru: 'Открытая ДЗ', tr: 'Toplam Açık Alacak' },
      value: formatMoney(totalOpen, ctx.tenant.locale, ctx.tenant.currency),
    },
    {
      id: 'customerCount',
      label: { en: 'Customers with Debt', ru: 'Должников', tr: 'Borçlu Müşteri' },
      value: String(customersAging.length),
    },
    {
      id: 'oldestDays',
      label: { en: 'Oldest Charge (days)', ru: 'Самый старый (дн)', tr: 'En Eski (gün)' },
      value: String(oldestDays),
      tone: oldestDays >= 90 ? 'negative' : 'neutral',
    },
    {
      id: 'riskPct',
      label: { en: '> 90g Risk', ru: '> 90 дн риск', tr: '> 90g Risk' },
      value: `${riskPct.toFixed(1)}%`,
      tone: riskPct >= 10 ? 'negative' : 'neutral',
    },
  ];

  // ---------- Aging buckets section ----------
  const bucketTotals: Record<string, { value: number; customers: Set<string>; invoices: number }> =
    {
      current: { value: 0, customers: new Set(), invoices: 0 },
      late1: { value: 0, customers: new Set(), invoices: 0 },
      late2: { value: 0, customers: new Set(), invoices: 0 },
      late3: { value: 0, customers: new Set(), invoices: 0 },
      late4: { value: 0, customers: new Set(), invoices: 0 },
    };
  for (const c of customersAging) {
    for (const [bKey, v] of Object.entries(c.perBucket)) {
      if (v > 0.005) {
        const slot = bucketTotals[bKey];
        if (!slot) continue;
        slot.value += v;
        slot.customers.add(c.id);
      }
    }
  }
  // Invoice counts approximated by remaining-charge count per bucket
  for (const c of customersAging) {
    for (const ch of chargesByCustomer.get(c.id) ?? []) {
      if (ch.amount <= 0.005) continue;
      const days = Math.floor((asOf.getTime() - ch.timestamp.getTime()) / (24 * 60 * 60 * 1000));
      const b = BUCKETS.find((bb) => days <= bb.maxDays);
      if (b) {
        const slot = bucketTotals[b.key];
        if (slot) slot.invoices += 1;
      }
    }
  }
  const maxBucketValue = Math.max(1, ...Object.values(bucketTotals).map((b) => b.value));

  const buckets: ReportAgingBucket[] = BUCKETS.map((b) => {
    const data = bucketTotals[b.key] ?? { value: 0, customers: new Set(), invoices: 0 };
    return {
      key: b.key,
      label: BUCKET_LABELS[b.key] ?? { en: b.key },
      value: formatMoney(data.value, ctx.tenant.locale, ctx.tenant.currency),
      count: {
        en: `${data.customers.size} customers · ${data.invoices} invoices`,
        ru: `${data.customers.size} клиентов · ${data.invoices} счетов`,
        tr: `${data.customers.size} müşteri · ${data.invoices} fatura`,
      },
      fillPct: Math.round((data.value / maxBucketValue) * 100),
      tone: b.tone,
    };
  });

  // ---------- Breakdown table ----------
  const breakdownRows: ReportBreakdownRow[] = customersAging.map((c) => ({
    id: c.id,
    cells: [
      <span key="n">
        <div className="row-title">{c.name}</div>
        <div className="row-sub">{c.code}</div>
      </span>,
      c.perBucket.current && c.perBucket.current > 0.005
        ? formatMoney(c.perBucket.current, ctx.tenant.locale, ctx.tenant.currency)
        : '—',
      c.perBucket.late1 && c.perBucket.late1 > 0.005
        ? formatMoney(c.perBucket.late1, ctx.tenant.locale, ctx.tenant.currency)
        : '—',
      c.perBucket.late2 && c.perBucket.late2 > 0.005
        ? formatMoney(c.perBucket.late2, ctx.tenant.locale, ctx.tenant.currency)
        : '—',
      c.perBucket.late3 && c.perBucket.late3 > 0.005
        ? formatMoney(c.perBucket.late3, ctx.tenant.locale, ctx.tenant.currency)
        : '—',
      c.perBucket.late4 && c.perBucket.late4 > 0.005
        ? formatMoney(c.perBucket.late4, ctx.tenant.locale, ctx.tenant.currency)
        : '—',
      <b key="t">{formatMoney(c.total, ctx.tenant.locale, ctx.tenant.currency)}</b>,
    ],
  }));

  // Totals row
  const totalsByBucket = BUCKETS.map((b) =>
    customersAging.reduce((s, c) => s + (c.perBucket[b.key] ?? 0), 0),
  );
  const grand = totalsByBucket.reduce((a, b) => a + b, 0);
  const breakdownTotals = [
    pickLabel(
      {
        en: `${customersAging.length} customers`,
        ru: `${customersAging.length} клиентов`,
        tr: `${customersAging.length} müşteri`,
      },
      ctx.tenant.locale,
    ),
    ...totalsByBucket.map((v) =>
      v > 0.005 ? formatMoney(v, ctx.tenant.locale, ctx.tenant.currency) : '—',
    ),
    formatMoney(grand, ctx.tenant.locale, ctx.tenant.currency),
  ];

  return {
    kpis,
    sections: [
      { kind: 'aging', buckets },
      {
        kind: 'breakdown',
        title: { en: 'By Customer', ru: 'По клиентам', tr: 'Müşteri Bazında' },
        dimensions: [
          { key: 'all', label: { en: 'All', ru: 'Все', tr: 'Tümü' } },
          { key: 'late', label: { en: 'Late only', ru: 'Просрочка', tr: 'Sadece geç' } },
          { key: '90', label: { en: '> 90 days', ru: '> 90 дн', tr: '> 90 gün' } },
        ],
        columns: [
          { key: 'cust', label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' } },
          { key: 'current', label: BUCKET_SHORT.current ?? { en: 'Curr' }, align: 'right' },
          { key: 'd1', label: BUCKET_SHORT.late1 ?? { en: '1-30g' }, align: 'right' },
          { key: 'd2', label: BUCKET_SHORT.late2 ?? { en: '31-60g' }, align: 'right' },
          { key: 'd3', label: BUCKET_SHORT.late3 ?? { en: '61-90g' }, align: 'right' },
          { key: 'd4', label: BUCKET_SHORT.late4 ?? { en: '90+g' }, align: 'right' },
          {
            key: 'tot',
            label: { en: 'Total', ru: 'Итого', tr: 'Toplam' },
            align: 'right',
          },
        ],
        rows: breakdownRows,
        totalsRow: breakdownTotals,
      },
    ],
  };
}
