import { formatMoney } from '@/lib/format-money';
import {
  type Locale,
  type LocalizedLabel,
  type ReportBreakdownRow,
  type ReportChartSection,
  type ReportKpiCard,
  type ReportRankedItem,
  type ReportRankedSection,
  type ReportViewConfig,
  type ReportViewPayload,
  defineReportView,
} from '@/platform/metadata';

/**
 * Turnover · Sales — monthly revenue trend + top sellers + per-category
 * breakdown, driven by `movement_sales_sale`.
 *
 * 12 monthly buckets ending at `period.end`. Returns (refunds) are tracked
 * via the `kind === 'return'` rows.
 */
export const turnoverSalesReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'turnover-sales',
    title: {
      en: 'Turnover · Sales',
      ru: 'Накопления · Продажи',
      tr: 'Ciro · Satış',
    },
    subtitleSecondary: {
      en: 'Turnover · Sales',
      ru: 'Накопления · Продажи',
      tr: 'Birikim · Satışlar',
    },
    breadcrumb: {
      en: 'Reports / Turnover / Sales',
      ru: 'Отчёты / Накопления / Продажи',
      tr: 'Raporlar / Ciro / Satış',
    },
    section: {
      en: 'Turnover',
      ru: 'Накопления',
      tr: 'Накопления (Ciro)',
    },
    hubCard: {
      icon: 'bar-chart-3',
      description: {
        en: 'Monthly sales trend, top sellers and category mix.',
        ru: 'Ежемесячная динамика продаж, топ-товары и категории.',
        tr: 'Aylık satış trendi, en çok satanlar ve kategori dağılımı.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadTurnoverSales,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

function initialsOf(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return '··';
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const a = words[0]?.[0] ?? '';
    const b = words[1]?.[0] ?? '';
    const combined = `${a}${b}`.toUpperCase();
    if (combined.length >= 2) return combined;
  }
  return cleaned.slice(0, 2).toUpperCase().padEnd(2, '·');
}

async function loadTurnoverSales(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, period, tenant } = ctx;

  const buckets = buildMonthlyBuckets(period.end, 12);
  const firstStart = buckets[0]?.start ?? period.end;
  const lastEnd = buckets[buckets.length - 1]?.end ?? period.end;

  const [windowMovements, products] = await Promise.all([
    tx.movement_sales_sale.findMany({
      where: {
        active: true,
        timestamp: { gte: firstStart, lt: lastEnd },
      },
      select: {
        kind: true,
        timestamp: true,
        product: true,
        quantity: true,
        revenue: true,
      },
    }),
    tx.catalog_inventory_product.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true, categoryId: true },
    }),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  const categoryIds = Array.from(
    new Set(products.map((p) => p.categoryId).filter((x): x is string => !!x)),
  );
  const categories = categoryIds.length
    ? await tx.catalog_inventory_product_category.findMany({
        where: { id: { in: categoryIds }, deletedAt: null },
        select: { id: true, name: true, code: true },
      })
    : [];
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  // Monthly buckets: revenue/refunds + per-product totals for ranked list.
  type MonthAgg = { revenue: number; refunds: number };
  const monthly: MonthAgg[] = buckets.map(() => ({ revenue: 0, refunds: 0 }));
  type ProductAgg = { revenue: number; quantity: number };
  const productAggs = new Map<string, ProductAgg>();
  type CategoryAgg = { revenue: number; quantity: number };
  const categoryAggs = new Map<string, CategoryAgg>();
  const uncategorizedAgg: CategoryAgg = { revenue: 0, quantity: 0 };

  for (const m of windowMovements) {
    const idx = findBucketIndex(buckets, m.timestamp);
    if (idx === -1) continue;
    const rev = Number(m.revenue);
    const qty = Number(m.quantity);
    const slot = monthly[idx];
    if (!slot) continue;
    if (m.kind === 'return') {
      slot.refunds += rev;
    } else {
      slot.revenue += rev;
      const cur = productAggs.get(m.product) ?? { revenue: 0, quantity: 0 };
      cur.revenue += rev;
      cur.quantity += qty;
      productAggs.set(m.product, cur);

      const prod = productById.get(m.product);
      const catId = prod?.categoryId ?? null;
      if (catId) {
        const c = categoryAggs.get(catId) ?? { revenue: 0, quantity: 0 };
        c.revenue += rev;
        c.quantity += qty;
        categoryAggs.set(catId, c);
      } else {
        uncategorizedAgg.revenue += rev;
        uncategorizedAgg.quantity += qty;
      }
    }
  }

  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const totalRefunds = monthly.reduce((s, m) => s + m.refunds, 0);
  const netRevenue = totalRevenue - totalRefunds;

  // Monthly growth = last full month vs previous full month
  const lastMonth = monthly[monthly.length - 1]?.revenue ?? 0;
  const prevMonth = monthly[monthly.length - 2]?.revenue ?? 0;
  const monthlyGrowth =
    Math.abs(prevMonth) > 0.005 ? ((lastMonth - prevMonth) / Math.abs(prevMonth)) * 100 : 0;

  const kpis: ReportKpiCard[] = [
    {
      id: 'totalRevenue',
      label: { en: 'Total Revenue', ru: 'Выручка', tr: 'Toplam Gelir' },
      value: formatMoney(totalRevenue, tenant.locale, tenant.currency),
    },
    {
      id: 'returns',
      label: { en: 'Returns', ru: 'Возвраты', tr: 'İadeler' },
      value: formatMoney(totalRefunds, tenant.locale, tenant.currency),
      tone: totalRefunds > 0 ? 'negative' : 'neutral',
    },
    {
      id: 'netRevenue',
      label: { en: 'Net Revenue', ru: 'Чистая выручка', tr: 'Net Gelir' },
      value: formatMoney(netRevenue, tenant.locale, tenant.currency),
      tone: 'positive',
    },
    {
      id: 'monthlyGrowth',
      label: { en: 'Monthly Growth', ru: 'Рост за месяц', tr: 'Aylık Büyüme' },
      value: `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth.toFixed(1)}%`,
      tone: monthlyGrowth >= 0 ? 'positive' : 'negative',
    },
  ];

  // Chart
  const points = monthly.map((m) => m.revenue - m.refunds);
  const first = points[0] ?? 0;
  const last = points[points.length - 1] ?? first;
  const changePct = Math.abs(first) > 0.005 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const monthFmt = new Intl.DateTimeFormat(tenant.locale, { month: 'short', timeZone: 'UTC' });
  const chart: ReportChartSection = {
    kind: 'chart',
    totalLabel: formatMoney(last, tenant.locale, tenant.currency),
    changePct,
    points,
    labels: buckets.map((b) => monthFmt.format(b.start)),
  };

  // Ranked: top 5 sellers
  const rankedSorted = Array.from(productAggs.entries())
    .map(([id, agg]) => ({ id, ...agg }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxRevenue = rankedSorted[0]?.revenue ?? 0;
  const safeMax = maxRevenue > 0 ? maxRevenue : 1;

  const rankedItems: ReportRankedItem[] = rankedSorted.map((p) => {
    const prod = productById.get(p.id);
    const displayName = prod?.name ?? prod?.code ?? p.id.slice(0, 8);
    return {
      id: p.id,
      initials: initialsOf(displayName),
      name: displayName,
      meta: pickLabel(
        {
          en: `${p.quantity} units`,
          ru: `${p.quantity} шт`,
          tr: `${p.quantity} adet`,
        },
        tenant.locale,
      ),
      amount: formatMoney(p.revenue, tenant.locale, tenant.currency),
      fillPct: Math.round((p.revenue / safeMax) * 100),
    };
  });
  const rankedSection: ReportRankedSection = {
    kind: 'ranked',
    title: {
      en: 'Top sellers',
      ru: 'Топ-товары',
      tr: 'En çok satanlar',
    },
    items: rankedItems,
  };

  // Breakdown: per category × revenue + qty + avg + growth
  type CategoryRow = {
    id: string;
    name: string;
    code: string;
    revenue: number;
    quantity: number;
  };
  const categoryRows: CategoryRow[] = [];
  for (const [id, agg] of categoryAggs) {
    const cat = categoryById.get(id);
    if (!cat) continue;
    categoryRows.push({
      id,
      name: cat.name,
      code: cat.code,
      revenue: agg.revenue,
      quantity: agg.quantity,
    });
  }
  if (uncategorizedAgg.revenue > 0.005 || uncategorizedAgg.quantity > 0) {
    categoryRows.push({
      id: 'uncat',
      name: pickLabel(
        { en: 'Uncategorized', ru: 'Без категории', tr: 'Kategorisiz' },
        tenant.locale,
      ),
      code: '—',
      revenue: uncategorizedAgg.revenue,
      quantity: uncategorizedAgg.quantity,
    });
  }
  categoryRows.sort((a, b) => b.revenue - a.revenue);

  const totalQty = categoryRows.reduce((s, r) => s + r.quantity, 0);
  const grandRev = categoryRows.reduce((s, r) => s + r.revenue, 0);
  const grandAvg = totalQty > 0 ? grandRev / totalQty : 0;

  const breakdownRows: ReportBreakdownRow[] = categoryRows.map((r) => {
    const avg = r.quantity > 0 ? r.revenue / r.quantity : 0;
    const sharePct = grandRev > 0.005 ? (r.revenue / grandRev) * 100 : 0;
    return {
      id: r.id,
      cells: [
        <div key="t" className="row-title">
          {r.name}
        </div>,
        String(r.quantity),
        formatMoney(r.revenue, tenant.locale, tenant.currency),
        formatMoney(avg, tenant.locale, tenant.currency),
        <span key="g" className="pill pill-success">
          {`${sharePct.toFixed(1)}%`}
        </span>,
      ],
    };
  });

  const totalsRow = [
    pickLabel({ en: 'Total', ru: 'Итого', tr: 'Toplam' }, tenant.locale),
    String(totalQty),
    formatMoney(grandRev, tenant.locale, tenant.currency),
    formatMoney(grandAvg, tenant.locale, tenant.currency),
    '100.0%',
  ];

  return {
    kpis,
    sections: [
      chart,
      rankedSection,
      {
        kind: 'breakdown',
        title: { en: 'By Category', ru: 'По категориям', tr: 'Kategori bazında' },
        dimensions: [
          { key: 'category', label: { en: 'Category', ru: 'Категория', tr: 'Kategori' } },
          { key: 'customer', label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' } },
          { key: 'month', label: { en: 'Month', ru: 'Месяц', tr: 'Ay' } },
        ],
        columns: [
          { key: 'name', label: { en: 'Dimension', ru: 'Измерение', tr: 'Boyut' } },
          {
            key: 'qty',
            label: { en: 'Qty', ru: 'Кол-во', tr: 'Adet' },
            align: 'right',
          },
          {
            key: 'rev',
            label: { en: 'Revenue', ru: 'Выручка', tr: 'Gelir' },
            align: 'right',
          },
          {
            key: 'avg',
            label: { en: 'Avg', ru: 'Средн.', tr: 'Ort.' },
            align: 'right',
          },
          {
            key: 'share',
            label: { en: 'Share', ru: 'Доля', tr: 'Pay' },
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
