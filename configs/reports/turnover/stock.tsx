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
 * Turnover · Stock — opening + received + shipped + closing per product
 * over the last 12 months. Driven by `movement_inventory_stock_balance`
 * with `kind ∈ {income, expense}`.
 *
 * Closing stock per month is derived from running total of monthly net
 * movements added to the opening valuation.
 */
export const turnoverStockReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'turnover-stock',
    title: {
      en: 'Turnover · Stock',
      ru: 'Накопления · Склад',
      tr: 'Ciro · Stok',
    },
    subtitleSecondary: {
      en: 'Turnover · Stock on hand',
      ru: 'Накопления · Остатки на складе',
      tr: 'Birikim · Depo stoğu',
    },
    breadcrumb: {
      en: 'Reports / Turnover / Stock',
      ru: 'Отчёты / Накопления / Склад',
      tr: 'Raporlar / Ciro / Stok',
    },
    section: {
      en: 'Turnover',
      ru: 'Накопления',
      tr: 'Накопления (Ciro)',
    },
    hubCard: {
      icon: 'boxes',
      description: {
        en: 'Opening + received + shipped + closing per product (12 months).',
        ru: 'Начало + приход + расход + остаток по товарам (12 мес).',
        tr: 'Açılış + giriş + çıkış + kapanış (ürün bazında, 12 ay).',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadTurnoverStock,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

async function loadTurnoverStock(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, period, tenant } = ctx;

  const buckets = buildMonthlyBuckets(period.end, 12);
  const firstStart = buckets[0]?.start ?? period.end;
  const lastEnd = buckets[buckets.length - 1]?.end ?? period.end;

  const [openingAgg, windowMovements, products, productOpeningAgg] = await Promise.all([
    tx.movement_inventory_stock_balance.groupBy({
      by: ['kind'],
      where: { active: true, timestamp: { lt: firstStart } },
      _sum: { totalCost: true },
    }),
    tx.movement_inventory_stock_balance.findMany({
      where: {
        active: true,
        timestamp: { gte: firstStart, lt: lastEnd },
      },
      select: {
        kind: true,
        timestamp: true,
        product: true,
        totalCost: true,
      },
    }),
    tx.catalog_inventory_product.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
    }),
    tx.movement_inventory_stock_balance.groupBy({
      by: ['product', 'kind'],
      where: { active: true, timestamp: { lt: firstStart } },
      _sum: { totalCost: true },
    }),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));

  let opening = 0;
  for (const g of openingAgg) {
    const v = Number(g._sum.totalCost ?? 0);
    if (g.kind === 'income') opening += v;
    else if (g.kind === 'expense') opening -= v;
  }

  const productOpening = new Map<string, number>();
  for (const g of productOpeningAgg) {
    const v = Number(g._sum.totalCost ?? 0);
    const cur = productOpening.get(g.product) ?? 0;
    productOpening.set(g.product, cur + (g.kind === 'income' ? v : -v));
  }

  type MonthAgg = { income: number; expense: number };
  const monthly: MonthAgg[] = buckets.map(() => ({ income: 0, expense: 0 }));
  type ProductAgg = { income: number; expense: number };
  const productAggs = new Map<string, ProductAgg>();

  for (const m of windowMovements) {
    const idx = findBucketIndex(buckets, m.timestamp);
    if (idx === -1) continue;
    const v = Number(m.totalCost);
    const slot = monthly[idx];
    if (!slot) continue;
    const prod = productAggs.get(m.product) ?? { income: 0, expense: 0 };
    if (m.kind === 'income') {
      slot.income += v;
      prod.income += v;
    } else if (m.kind === 'expense') {
      slot.expense += v;
      prod.expense += v;
    }
    productAggs.set(m.product, prod);
  }

  let running = opening;
  const closings: number[] = monthly.map((m) => {
    running = running + m.income - m.expense;
    return running;
  });

  const totalIncome = monthly.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthly.reduce((s, m) => s + m.expense, 0);
  const closing = closings[closings.length - 1] ?? opening;

  const kpis: ReportKpiCard[] = [
    {
      id: 'opening',
      label: { en: 'Opening', ru: 'Начало', tr: 'Açılış' },
      value: formatMoney(opening, tenant.locale, tenant.currency),
    },
    {
      id: 'received',
      label: { en: 'Received', ru: 'Приход', tr: 'Giriş' },
      value: formatMoney(totalIncome, tenant.locale, tenant.currency),
    },
    {
      id: 'shipped',
      label: { en: 'Shipped', ru: 'Расход', tr: 'Çıkış' },
      value: formatMoney(totalExpense, tenant.locale, tenant.currency),
    },
    {
      id: 'closing',
      label: { en: 'Closing', ru: 'Остаток', tr: 'Kapanış' },
      value: formatMoney(closing, tenant.locale, tenant.currency),
      tone: closing >= opening ? 'positive' : 'neutral',
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

  type ProductRow = {
    id: string;
    name: string;
    code: string;
    opening: number;
    income: number;
    expense: number;
    closing: number;
  };
  const productRows: ProductRow[] = [];
  const allIds = new Set<string>([...productOpening.keys(), ...productAggs.keys()]);
  for (const id of allIds) {
    const prod = productById.get(id);
    if (!prod) continue;
    const op = productOpening.get(id) ?? 0;
    const agg = productAggs.get(id) ?? { income: 0, expense: 0 };
    const close = op + agg.income - agg.expense;
    if (
      Math.abs(op) < 0.005 &&
      Math.abs(agg.income) < 0.005 &&
      Math.abs(agg.expense) < 0.005 &&
      Math.abs(close) < 0.005
    ) {
      continue;
    }
    productRows.push({
      id,
      name: prod.name,
      code: prod.code,
      opening: op,
      income: agg.income,
      expense: agg.expense,
      closing: close,
    });
  }
  productRows.sort((a, b) => b.closing - a.closing);

  const breakdownRows: ReportBreakdownRow[] = productRows.map((r) => ({
    id: r.id,
    cells: [
      <span key="n">
        <div className="row-title">{r.name}</div>
        <div className="row-sub">{r.code}</div>
      </span>,
      formatMoney(r.opening, tenant.locale, tenant.currency),
      `+${formatMoney(r.income, tenant.locale, tenant.currency)}`,
      `−${formatMoney(r.expense, tenant.locale, tenant.currency)}`,
      <b key="c">{formatMoney(r.closing, tenant.locale, tenant.currency)}</b>,
    ],
  }));

  const totalsRow = [
    pickLabel(
      {
        en: `${productRows.length} products`,
        ru: `${productRows.length} товаров`,
        tr: `${productRows.length} ürün`,
      },
      tenant.locale,
    ),
    formatMoney(opening, tenant.locale, tenant.currency),
    `+${formatMoney(totalIncome, tenant.locale, tenant.currency)}`,
    `−${formatMoney(totalExpense, tenant.locale, tenant.currency)}`,
    formatMoney(closing, tenant.locale, tenant.currency),
  ];

  return {
    kpis,
    sections: [
      chart,
      {
        kind: 'breakdown',
        title: { en: 'By Product', ru: 'По товарам', tr: 'Ürün bazında' },
        dimensions: [
          { key: 'product', label: { en: 'Product', ru: 'Товар', tr: 'Ürün' } },
          { key: 'warehouse', label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' } },
        ],
        columns: [
          { key: 'name', label: { en: 'Product', ru: 'Товар', tr: 'Ürün' } },
          {
            key: 'opening',
            label: { en: 'Opening', ru: 'Начало', tr: 'Açılış' },
            align: 'right',
          },
          {
            key: 'in',
            label: { en: 'Received', ru: 'Приход', tr: 'Giriş' },
            align: 'right',
          },
          {
            key: 'out',
            label: { en: 'Shipped', ru: 'Расход', tr: 'Çıkış' },
            align: 'right',
          },
          {
            key: 'closing',
            label: { en: 'Closing', ru: 'Остаток', tr: 'Kapanış' },
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
