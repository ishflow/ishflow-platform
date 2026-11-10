import { formatMoney } from '@/lib/format-money';
import {
  type Locale,
  type LocalizedLabel,
  type ReportBreakdownRow,
  type ReportKpiCard,
  type ReportViewConfig,
  type ReportViewPayload,
  defineReportView,
} from '@/platform/metadata';

/**
 * Slow-moving stock report — per (product, warehouse) idle inventory.
 *
 * On-hand qty = Σ income − Σ expense up to `asOf` (period.end). Idle days =
 * (asOf − max(timestamp where kind='expense')). Rows kept only if qty > 0
 * AND idleDays ≥ 90. Bands: 90–180 / 180–365 / 365+. Chip filter narrows
 * the breakdown; KPIs always reflect the full slow-moving set.
 *
 * Recommendation pill:
 *   - 365+ days idle               → write-off (danger)
 *   - 180–365 days idle            → discount (warning)
 *   - 90–180 days idle, value ≥ avg → return  (info)
 *   - else                         → discount (warning)
 */
export const slowStockReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'slow-stock',
    title: {
      en: 'Slow-moving stock',
      ru: 'Медленно оборачиваемые товары',
      tr: 'Yavaş stok',
    },
    subtitleSecondary: {
      en: 'Slow-moving items · Stock',
      ru: 'Медленно оборачиваемые товары · Stock',
      tr: 'Yavaş dönen ürünler · Stok',
    },
    countLabel: (n) => ({
      en: `${n} items`,
      ru: `${n} позиций`,
      tr: `${n} ürün`,
    }),
    breadcrumb: {
      en: 'Reports / Slow stock',
      ru: 'Отчёты / Медленный сток',
      tr: 'Raporlar / Yavaş stok',
    },
    section: {
      en: 'Operational',
      ru: 'Оперативные',
      tr: 'Operasyonel',
    },
    hubCard: {
      icon: 'boxes',
      description: {
        en: 'Items inactive > 90 days with suggested action.',
        ru: 'Товары без движения > 90 дней с рекомендацией.',
        tr: '90 günden uzun süredir hareket görmeyen ürünler.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadSlowStock,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

const BAND_LABELS: Record<string, LocalizedLabel> = {
  all: { en: 'All', ru: 'Все', tr: 'Tümü' },
  '90-180': { en: '90–180g', ru: '90–180 дн', tr: '90–180g' },
  '180-365': { en: '180–365g', ru: '180–365 дн', tr: '180–365g' },
  '365+': { en: '365g+', ru: '365 дн+', tr: '365g+' },
};

const RECO_LABELS = {
  writeOff: { en: 'Write-off', ru: 'Списать', tr: 'Hurda' } as LocalizedLabel,
  return: { en: 'Return to supplier', ru: 'Возврат', tr: 'İade' } as LocalizedLabel,
  discount: (pct: number): LocalizedLabel => ({
    en: `Discount ${pct}%`,
    ru: `Скидка ${pct}%`,
    tr: `İndirim %${pct}`,
  }),
};

function bandFor(idleDays: number): '90-180' | '180-365' | '365+' {
  if (idleDays >= 365) return '365+';
  if (idleDays >= 180) return '180-365';
  return '90-180';
}

async function loadSlowStock(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx } = ctx;
  const asOf = ctx.period.end;

  const [incomeAgg, expenseAgg, lastExpenseAgg, products, warehouses] = await Promise.all([
    tx.movement_inventory_stock_balance.groupBy({
      by: ['product', 'warehouse'],
      where: { active: true, kind: 'income', timestamp: { lte: asOf } },
      _sum: { quantity: true },
    }),
    tx.movement_inventory_stock_balance.groupBy({
      by: ['product', 'warehouse'],
      where: { active: true, kind: 'expense', timestamp: { lte: asOf } },
      _sum: { quantity: true },
    }),
    tx.movement_inventory_stock_balance.groupBy({
      by: ['product', 'warehouse'],
      where: { active: true, kind: 'expense', timestamp: { lte: asOf } },
      _max: { timestamp: true },
    }),
    tx.catalog_inventory_product.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, costPrice: true, minStock: true },
    }),
    tx.catalog_inventory_warehouse.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true },
    }),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  const warehouseById = new Map(warehouses.map((w) => [w.id, w]));

  const expenseByKey = new Map<string, number>();
  for (const e of expenseAgg) {
    expenseByKey.set(`${e.product}|${e.warehouse}`, Number(e._sum.quantity ?? 0));
  }
  const lastExpenseByKey = new Map<string, Date | null>();
  for (const e of lastExpenseAgg) {
    lastExpenseByKey.set(`${e.product}|${e.warehouse}`, e._max.timestamp ?? null);
  }

  type SlowRow = {
    key: string;
    productId: string;
    warehouseId: string;
    qty: number;
    value: number;
    lastSale: Date | null;
    idleDays: number;
  };

  const slowRows: SlowRow[] = [];
  const asOfMs = asOf.getTime();

  for (const i of incomeAgg) {
    const key = `${i.product}|${i.warehouse}`;
    const inQty = Number(i._sum.quantity ?? 0);
    const outQty = expenseByKey.get(key) ?? 0;
    const qty = inQty - outQty;
    if (qty <= 0) continue;

    const lastSale = lastExpenseByKey.get(key) ?? null;
    // No expense ever recorded → idle since "forever" — bucket as 365+.
    // Otherwise idleDays = days since last expense.
    const idleDays = lastSale
      ? Math.floor((asOfMs - lastSale.getTime()) / 86_400_000)
      : Number.POSITIVE_INFINITY;
    if (idleDays < 90) continue;

    const prod = productById.get(i.product);
    if (!prod) continue;
    const cost = Number(prod.costPrice ?? 0);
    const value = qty * cost;

    slowRows.push({
      key,
      productId: i.product,
      warehouseId: i.warehouse,
      qty,
      value,
      lastSale,
      idleDays,
    });
  }

  slowRows.sort((a, b) => b.value - a.value);

  // ---------- KPIs ----------
  const slowItemCount = slowRows.length;
  const totalSlowValue = slowRows.reduce((s, r) => s + r.value, 0);
  const avgAgeDays = slowRows.length
    ? Math.round(
        slowRows.reduce((s, r) => s + (Number.isFinite(r.idleDays) ? r.idleDays : 365), 0) /
          slowRows.length,
      )
    : 0;
  const oldestDays = slowRows.reduce(
    (m, r) => Math.max(m, Number.isFinite(r.idleDays) ? r.idleDays : 365),
    0,
  );
  const avgValue = slowRows.length ? totalSlowValue / slowRows.length : 0;

  const bandCounts = { '90-180': 0, '180-365': 0, '365+': 0 };
  for (const r of slowRows) bandCounts[bandFor(r.idleDays)] += 1;

  const kpis: ReportKpiCard[] = [
    {
      id: 'slowItemCount',
      label: { en: 'Slow-moving items', ru: 'Медленных позиций', tr: 'Yavaş ürün' },
      value: String(slowItemCount),
      tone: slowItemCount > 0 ? 'negative' : 'neutral',
    },
    {
      id: 'totalSlowValue',
      label: { en: 'Stock value', ru: 'Стоимость стока', tr: 'Stok değeri' },
      value: formatMoney(totalSlowValue, ctx.tenant.locale, ctx.tenant.currency),
      tone: totalSlowValue > 0 ? 'negative' : 'neutral',
    },
    {
      id: 'avgAgeDays',
      label: { en: 'Average age', ru: 'Средний возраст', tr: 'Ortalama yaş' },
      value: pickLabel(
        { en: `${avgAgeDays} days`, ru: `${avgAgeDays} дн`, tr: `${avgAgeDays} gün` },
        ctx.tenant.locale,
      ),
      tone: avgAgeDays >= 180 ? 'negative' : 'neutral',
    },
    {
      id: 'oldestDays',
      label: { en: 'Oldest item', ru: 'Самая старая', tr: 'En eski' },
      value: pickLabel(
        { en: `${oldestDays} days`, ru: `${oldestDays} дн`, tr: `${oldestDays} gün` },
        ctx.tenant.locale,
      ),
      tone: oldestDays >= 365 ? 'negative' : 'neutral',
    },
  ];

  // ---------- Chip filter ----------
  const chips = [
    { key: 'all', label: BAND_LABELS.all ?? { en: 'All' }, count: slowItemCount },
    {
      key: '90-180',
      label: BAND_LABELS['90-180'] ?? { en: '90–180' },
      count: bandCounts['90-180'],
    },
    {
      key: '180-365',
      label: BAND_LABELS['180-365'] ?? { en: '180–365' },
      count: bandCounts['180-365'],
    },
    {
      key: '365+',
      label: BAND_LABELS['365+'] ?? { en: '365+' },
      count: bandCounts['365+'],
    },
  ];

  // ---------- Filtered rows by chip ----------
  const activeChip = ctx.chip ?? 'all';
  const filtered =
    activeChip === 'all' ? slowRows : slowRows.filter((r) => bandFor(r.idleDays) === activeChip);

  // ---------- Date formatter (locale-aware) ----------
  const dateFmt = new Intl.DateTimeFormat(ctx.tenant.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  // ---------- Breakdown rows ----------
  const breakdownRows: ReportBreakdownRow[] = filtered.map((r) => {
    const prod = productById.get(r.productId);
    const wh = warehouseById.get(r.warehouseId);
    const productName = prod?.name ?? r.productId.slice(0, 8);
    const productSku = prod?.code ?? '—';
    const warehouseName = wh?.name ?? r.warehouseId.slice(0, 8);

    const band = bandFor(r.idleDays);
    let recoLabel: LocalizedLabel;
    let pillClass: string;
    if (band === '365+') {
      recoLabel = RECO_LABELS.writeOff;
      pillClass = 'pill pill-danger';
    } else if (band === '180-365') {
      const pct = r.idleDays >= 270 ? 30 : 20;
      recoLabel = RECO_LABELS.discount(pct);
      pillClass = 'pill pill-warning';
    } else if (r.value >= avgValue) {
      recoLabel = RECO_LABELS.return;
      pillClass = 'pill pill-info';
    } else {
      const pct = 10;
      recoLabel = RECO_LABELS.discount(pct);
      pillClass = 'pill pill-warning';
    }

    const lastSaleText = r.lastSale
      ? dateFmt.format(r.lastSale)
      : pickLabel({ en: 'Never', ru: 'Никогда', tr: 'Hiç' }, ctx.tenant.locale);

    const idleText = Number.isFinite(r.idleDays)
      ? pickLabel(
          { en: `${r.idleDays}d`, ru: `${r.idleDays} дн`, tr: `${r.idleDays}g` },
          ctx.tenant.locale,
        )
      : pickLabel({ en: '∞', ru: '∞', tr: '∞' }, ctx.tenant.locale);

    return {
      id: r.key,
      cells: [
        <span key="p">
          <div className="row-title">{productName}</div>
          <div className="row-sub">SKU {productSku}</div>
        </span>,
        warehouseName,
        String(r.qty),
        formatMoney(r.value, ctx.tenant.locale, ctx.tenant.currency),
        lastSaleText,
        idleText,
        <span key="r" className={pillClass}>
          {pickLabel(recoLabel, ctx.tenant.locale)}
        </span>,
      ],
    };
  });

  // ---------- Totals row ----------
  const totalQty = filtered.reduce((s, r) => s + r.qty, 0);
  const totalValue = filtered.reduce((s, r) => s + r.value, 0);
  const totalsRow = [
    pickLabel(
      {
        en: `${filtered.length} items`,
        ru: `${filtered.length} позиций`,
        tr: `${filtered.length} ürün`,
      },
      ctx.tenant.locale,
    ),
    '',
    String(totalQty),
    formatMoney(totalValue, ctx.tenant.locale, ctx.tenant.currency),
    '',
    '',
    '',
  ];

  return {
    kpis,
    chips,
    sections: [
      {
        kind: 'breakdown',
        title: { en: 'Item list', ru: 'Список товаров', tr: 'Ürün listesi' },
        columns: [
          { key: 'product', label: { en: 'Product', ru: 'Товар', tr: 'Ürün' } },
          {
            key: 'warehouse',
            label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
          },
          {
            key: 'qty',
            label: { en: 'Stock qty', ru: 'Кол-во', tr: 'Stok adet' },
            align: 'right',
          },
          {
            key: 'value',
            label: { en: 'Stock value', ru: 'Стоимость', tr: 'Stok değeri' },
            align: 'right',
          },
          {
            key: 'lastSale',
            label: { en: 'Last sale', ru: 'Последняя продажа', tr: 'Son satış' },
          },
          {
            key: 'idle',
            label: { en: 'Idle', ru: 'Простой', tr: 'Hareketsiz' },
            align: 'right',
          },
          {
            key: 'reco',
            label: { en: 'Suggestion', ru: 'Рекомендация', tr: 'Öneri' },
          },
        ],
        rows: breakdownRows,
        totalsRow,
      },
    ],
  };
}
