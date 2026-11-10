import { formatMoney } from '@/lib/format-money';
import {
  type Locale,
  type LocalizedLabel,
  type ReportBreakdownRow,
  type ReportChartSection,
  type ReportKpiCard,
  type ReportRankedItem,
  type ReportViewConfig,
  type ReportViewPayload,
  defineReportView,
} from '@/platform/metadata';

/**
 * Gross profit report — revenue, cost and margin derived from the
 * `movement_sales_sale` register. Compares the selected period to the
 * immediately-prior window of equal length, plus a 12-month profit
 * trend, top-5 products by profit, and a per-product breakdown.
 *
 * V0 scope: single `product` dimension. Category / customer / warehouse
 * pivots will land once the register carries those FKs.
 */
export const grossProfitReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'gross-profit',
    title: {
      en: 'Gross profit',
      ru: 'Валовая прибыль',
      tr: 'Brüt kar',
    },
    subtitleSecondary: {
      en: 'Gross profit · GP',
      ru: 'Валовая прибыль · GP',
      tr: 'Brüt kâr · GP',
    },
    countLabel: (n) => ({
      en: `${n} products`,
      ru: `${n} товаров`,
      tr: `${n} ürün`,
    }),
    breadcrumb: {
      en: 'Reports / Gross profit',
      ru: 'Отчёты / Валовая прибыль',
      tr: 'Raporlar / Brüt kar',
    },
    section: {
      en: 'Gross Profit',
      ru: 'Валовая прибыль',
      tr: 'Brüt kar',
    },
    hubCard: {
      icon: 'trending-up',
      description: {
        en: 'Revenue − cost by product · period comparison.',
        ru: 'Выручка − себестоимость по товарам · сравнение периодов.',
        tr: 'Gelir − maliyet, ürün bazında · dönem karşılaştırması.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadGrossProfit,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

type ProductAggregate = {
  product: string;
  revenue: number;
  cost: number;
  quantity: number;
};

async function aggregateByProduct(
  tx: Parameters<ReportViewConfig['loader']>[0]['tx'],
  start: Date,
  end: Date,
): Promise<ProductAggregate[]> {
  const groups = await tx.movement_sales_sale.groupBy({
    by: ['product'],
    where: { active: true, timestamp: { gte: start, lt: end } },
    _sum: { revenue: true, cost: true, quantity: true },
  });
  return groups.map((g) => ({
    product: g.product,
    revenue: Number(g._sum.revenue ?? 0),
    cost: Number(g._sum.cost ?? 0),
    quantity: Number(g._sum.quantity ?? 0),
  }));
}

function sumAggregates(rows: ProductAggregate[]): { revenue: number; cost: number; qty: number } {
  return rows.reduce(
    (acc, r) => {
      acc.revenue += r.revenue;
      acc.cost += r.cost;
      acc.qty += r.quantity;
      return acc;
    },
    { revenue: 0, cost: 0, qty: 0 },
  );
}

function deltaCard(
  id: string,
  label: LocalizedLabel,
  current: number,
  prior: number,
  formatter: (n: number) => string,
  noteLabel: LocalizedLabel,
): ReportKpiCard {
  const diff = current - prior;
  const pct = prior !== 0 ? (diff / Math.abs(prior)) * 100 : 0;
  const direction: 'up' | 'down' = current >= prior ? 'up' : 'down';
  const sign = pct >= 0 ? '+' : '';
  return {
    id,
    label,
    value: formatter(current),
    delta: {
      direction,
      formatted: `${sign}${pct.toFixed(1)}%`,
      note: noteLabel,
    },
  };
}

async function loadGrossProfit(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, tenant, period } = ctx;
  const { locale, currency } = tenant;

  const start = period.start;
  const end = period.end;
  const periodLen = end.getTime() - start.getTime();
  const priorStart = new Date(start.getTime() - periodLen);
  const priorEnd = start;

  const noteVsPrior: LocalizedLabel = {
    en: 'vs prior period',
    ru: 'против пред. периода',
    tr: 'önceki döneme göre',
  };

  // ---------- Current + prior period aggregates ----------
  const [current, prior] = await Promise.all([
    aggregateByProduct(tx, start, end),
    aggregateByProduct(tx, priorStart, priorEnd),
  ]);

  const curTotals = sumAggregates(current);
  const priorTotals = sumAggregates(prior);
  const curProfit = curTotals.revenue - curTotals.cost;
  const priorProfit = priorTotals.revenue - priorTotals.cost;
  const curMargin = curTotals.revenue > 0 ? (curProfit / curTotals.revenue) * 100 : 0;
  const priorMargin = priorTotals.revenue > 0 ? (priorProfit / priorTotals.revenue) * 100 : 0;

  const moneyFmt = (n: number) => formatMoney(n, locale, currency);
  const pctFmt = (n: number) => `${n.toFixed(1)}%`;

  const kpis: ReportKpiCard[] = [
    deltaCard(
      'revenue',
      { en: 'Revenue', ru: 'Выручка', tr: 'Gelir' },
      curTotals.revenue,
      priorTotals.revenue,
      moneyFmt,
      noteVsPrior,
    ),
    deltaCard(
      'cost',
      { en: 'Cost', ru: 'Себестоимость', tr: 'Maliyet' },
      curTotals.cost,
      priorTotals.cost,
      moneyFmt,
      noteVsPrior,
    ),
    deltaCard(
      'grossProfit',
      { en: 'Gross profit', ru: 'Валовая прибыль', tr: 'Brüt kar' },
      curProfit,
      priorProfit,
      moneyFmt,
      noteVsPrior,
    ),
    {
      id: 'marginPct',
      label: { en: 'Margin', ru: 'Маржа', tr: 'Marj' },
      value: pctFmt(curMargin),
      delta: {
        direction: curMargin >= priorMargin ? 'up' : 'down',
        formatted: `${curMargin - priorMargin >= 0 ? '+' : ''}${(curMargin - priorMargin).toFixed(1)} pts`,
        note: noteVsPrior,
      },
    },
  ];

  // ---------- 12-month profit chart (rolling, ending at period.end) ----------
  const chartEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1, 0, 0, 0, 0));
  const chartStart = new Date(
    Date.UTC(chartEnd.getUTCFullYear(), chartEnd.getUTCMonth() - 12, 1, 0, 0, 0, 0),
  );

  const movements = await tx.movement_sales_sale.findMany({
    where: { active: true, timestamp: { gte: chartStart, lt: chartEnd } },
    select: { timestamp: true, revenue: true, cost: true },
  });

  const monthBuckets = new Array<number>(12).fill(0);
  const monthLabels: string[] = [];
  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  for (let i = 0; i < 12; i++) {
    const d = new Date(
      Date.UTC(chartStart.getUTCFullYear(), chartStart.getUTCMonth() + i, 1, 0, 0, 0, 0),
    );
    monthLabels.push(monthFmt.format(d));
  }
  for (const m of movements) {
    const ts = m.timestamp;
    const monthsFromStart =
      (ts.getUTCFullYear() - chartStart.getUTCFullYear()) * 12 +
      (ts.getUTCMonth() - chartStart.getUTCMonth());
    if (monthsFromStart < 0 || monthsFromStart >= 12) continue;
    const profit = Number(m.revenue) - Number(m.cost);
    monthBuckets[monthsFromStart] = (monthBuckets[monthsFromStart] ?? 0) + profit;
  }
  const chartTotalProfit = monthBuckets.reduce((a, b) => a + b, 0);
  const chartChangePct =
    priorProfit !== 0 ? ((curProfit - priorProfit) / Math.abs(priorProfit)) * 100 : 0;
  const chartSection: ReportChartSection = {
    kind: 'chart',
    totalLabel: moneyFmt(chartTotalProfit),
    changePct: Number(chartChangePct.toFixed(1)),
    points: monthBuckets,
    labels: monthLabels,
  };

  // ---------- Product lookup for ranked + breakdown ----------
  const productIds = Array.from(new Set(current.map((r) => r.product)));
  const products = productIds.length
    ? await tx.catalog_inventory_product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, code: true, name: true },
      })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  // ---------- Top-5 products by profit (ranked) ----------
  const byProfit = current
    .map((r) => ({
      ...r,
      profit: r.revenue - r.cost,
      marginPct: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  const top5 = byProfit.slice(0, 5);
  const topMaxProfit = top5[0]?.profit ?? 0;
  const rankedItems: ReportRankedItem[] = top5.map((r) => {
    const prod = productById.get(r.product);
    const code = prod?.code ?? '';
    const initials = (code.slice(0, 2) || '··').toUpperCase();
    const name = prod?.name ?? code;
    const meta = pickLabel(
      {
        en: `${r.marginPct.toFixed(1)}% · ${r.quantity}`,
        ru: `${r.marginPct.toFixed(1)}% · ${r.quantity}`,
        tr: `${r.marginPct.toFixed(1)}% · ${r.quantity}`,
      },
      locale,
    );
    const fillPct = topMaxProfit > 0 ? Math.max(0, Math.round((r.profit / topMaxProfit) * 100)) : 0;
    return {
      id: r.product,
      initials,
      name,
      meta,
      amount: moneyFmt(r.profit),
      fillPct,
    };
  });

  // ---------- Per-product breakdown ----------
  const breakdownRows: ReportBreakdownRow[] = byProfit.map((r) => {
    const prod = productById.get(r.product);
    const name = prod?.name ?? r.product;
    const code = prod?.code ?? '';
    // Absolute gross-margin %, not a period-over-period delta — no leading '+'.
    const marginText = `${r.marginPct.toFixed(1)}%`;
    return {
      id: r.product,
      cells: [
        <span key="n">
          <div className="row-title">{name}</div>
          {code ? <div className="row-sub">{code}</div> : null}
        </span>,
        moneyFmt(r.revenue),
        moneyFmt(r.cost),
        moneyFmt(r.profit),
        <span key="m" className={r.profit >= 0 ? 'pill pill-success' : 'pill pill-danger'}>
          {marginText}
        </span>,
        String(r.quantity),
      ],
    };
  });

  const totalsQty = byProfit.reduce((s, r) => s + r.quantity, 0);
  const breakdownTotals = [
    pickLabel(
      {
        en: `${byProfit.length} products`,
        ru: `${byProfit.length} товаров`,
        tr: `${byProfit.length} ürün`,
      },
      locale,
    ),
    moneyFmt(curTotals.revenue),
    moneyFmt(curTotals.cost),
    moneyFmt(curProfit),
    <b key="m">{pctFmt(curMargin)}</b>,
    String(totalsQty),
  ];

  return {
    kpis,
    sections: [
      chartSection,
      {
        kind: 'ranked',
        title: { en: 'Top products', ru: 'Топ товары', tr: 'En çok kar' },
        items: rankedItems,
      },
      {
        kind: 'breakdown',
        title: { en: 'By product', ru: 'По товарам', tr: 'Ürün bazında' },
        dimensions: [{ key: 'product', label: { en: 'Product', ru: 'Товар', tr: 'Ürün' } }],
        columns: [
          { key: 'name', label: { en: 'Product', ru: 'Товар', tr: 'Ürün' } },
          {
            key: 'rev',
            label: { en: 'Revenue', ru: 'Выручка', tr: 'Gelir' },
            align: 'right',
          },
          {
            key: 'cost',
            label: { en: 'Cost', ru: 'Себестоимость', tr: 'Maliyet' },
            align: 'right',
          },
          {
            key: 'profit',
            label: { en: 'Profit', ru: 'Прибыль', tr: 'Kar' },
            align: 'right',
          },
          {
            key: 'margin',
            label: { en: 'Margin', ru: 'Маржа', tr: 'Marj' },
            align: 'right',
          },
          {
            key: 'qty',
            label: { en: 'Qty', ru: 'Кол-во', tr: 'Adet' },
            align: 'right',
          },
        ],
        rows: breakdownRows,
        totalsRow: breakdownTotals,
      },
    ],
  };
}
