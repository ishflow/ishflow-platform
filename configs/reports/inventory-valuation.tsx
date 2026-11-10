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
 * Inventory Valuation — snapshot at `period.end` of every (warehouse, product)
 * cell holding stock, valued at moving-average cost. Mirrors the 1C
 * "Стоимостная оценка остатков" / "Inventory valuation" report — single
 * data source (`movement_inventory_stock_balance`), no period bands.
 */
export const inventoryValuationReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'inventory-valuation',
    title: {
      en: 'Inventory Valuation',
      ru: 'Оценка стока',
      tr: 'Stok Değerleme',
    },
    subtitleSecondary: {
      en: 'Stock cost valuation',
      ru: 'Стоимостная оценка остатков',
      tr: 'Stok maliyet değerlemesi',
    },
    breadcrumb: {
      en: 'Reports / Inventory Valuation',
      ru: 'Отчёты / Оценка стока',
      tr: 'Raporlar / Stok Değerleme',
    },
    section: {
      en: 'Inventory',
      ru: 'Склад',
      tr: 'Stok',
    },
    hubCard: {
      icon: 'boxes',
      description: {
        en: 'Per-warehouse stock valued at moving average cost.',
        ru: 'Остатки в разрезе складов по средней себестоимости.',
        tr: 'Depo bazlı stok, hareketli ortalama maliyetle değerlenmiş.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadInventoryValuation,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

async function loadInventoryValuation(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, period, tenant } = ctx;

  // Aggregate all stock movements up to period.end into (warehouse, product)
  // running cells. amount is base currency, quantity is units.
  const movements = (await tx.movement_inventory_stock_balance.findMany({
    where: { active: true, timestamp: { lt: period.end } },
    select: { warehouse: true, product: true, kind: true, quantity: true, totalCost: true },
  })) as Array<{
    warehouse: string;
    product: string;
    kind: string;
    quantity: unknown;
    totalCost: unknown;
  }>;

  type Cell = { qty: number; totalCost: number };
  const cells = new Map<string, Cell>(); // key: warehouse:product
  for (const m of movements) {
    const key = `${m.warehouse}:${m.product}`;
    const c = cells.get(key) ?? { qty: 0, totalCost: 0 };
    const q = Number(m.quantity ?? 0);
    const tc = Number(m.totalCost ?? 0);
    if (m.kind === 'income') {
      c.qty += q;
      c.totalCost += tc;
    } else if (m.kind === 'expense') {
      c.qty -= q;
      c.totalCost -= tc;
    }
    cells.set(key, c);
  }

  // Hydrate warehouse + product names. Drop zero-balance cells (closed positions).
  type Live = { wId: string; pId: string; cell: Cell };
  const liveCells: Live[] = [...cells.entries()]
    .filter(([, c]) => Math.abs(c.qty) > 0.0001)
    .map(([k, c]) => {
      const [wId = '', pId = ''] = k.split(':');
      return { wId, pId, cell: c };
    });
  const warehouseIds = [...new Set(liveCells.map((l) => l.wId))];
  const productIds = [...new Set(liveCells.map((l) => l.pId))];

  const [warehouses, products] = await Promise.all([
    tx.catalog_inventory_warehouse.findMany({
      where: { id: { in: warehouseIds }, deletedAt: null },
      select: { id: true, name: true, code: true },
    }),
    tx.catalog_inventory_product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
      select: { id: true, name: true, code: true, unit: true },
    }),
  ]);
  const whById = new Map(warehouses.map((w) => [w.id, w]));
  const prodById = new Map(products.map((p) => [p.id, p]));

  // Sort: by warehouse name, then product name.
  type Row = {
    warehouseId: string;
    warehouseName: string;
    productId: string;
    productName: string;
    productCode: string;
    unit: string;
    qty: number;
    avgCost: number;
    value: number;
  };
  const rows: Row[] = liveCells.map(({ wId, pId, cell: c }) => {
    const w = whById.get(wId);
    const p = prodById.get(pId);
    const avgCost = c.qty > 0 ? c.totalCost / c.qty : 0;
    return {
      warehouseId: wId,
      warehouseName: w?.name ?? wId.slice(0, 8),
      productId: pId,
      productName: p?.name ?? pId.slice(0, 8),
      productCode: p?.code ?? '',
      unit: p?.unit ?? '',
      qty: c.qty,
      avgCost,
      value: c.totalCost,
    };
  });
  rows.sort((a, b) => {
    if (a.warehouseName !== b.warehouseName) return a.warehouseName.localeCompare(b.warehouseName);
    return a.productName.localeCompare(b.productName);
  });

  // KPIs
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const productCount = new Set(rows.map((r) => r.productId)).size;
  const warehouseCount = new Set(rows.map((r) => r.warehouseId)).size;
  const topRow = [...rows].sort((a, b) => b.value - a.value)[0];

  const kpis: ReportKpiCard[] = [
    {
      id: 'totalValue',
      label: {
        en: 'Total stock value',
        ru: 'Общая стоимость',
        tr: 'Toplam Stok Değeri',
      },
      value: formatMoney(totalValue, tenant.locale, tenant.currency),
      tone: 'positive',
    },
    {
      id: 'productCount',
      label: {
        en: 'Products in stock',
        ru: 'Номенклатура',
        tr: 'Stoktaki Ürün',
      },
      value: String(productCount),
    },
    {
      id: 'warehouseCount',
      label: {
        en: 'Active warehouses',
        ru: 'Активных складов',
        tr: 'Aktif Depo',
      },
      value: String(warehouseCount),
    },
    {
      id: 'topProduct',
      label: {
        en: 'Top SKU value',
        ru: 'Топ-позиция',
        tr: 'En Yüksek Değer',
      },
      value: topRow ? formatMoney(topRow.value, tenant.locale, tenant.currency) : '—',
    },
  ];

  const qtyFmt = new Intl.NumberFormat(tenant.locale, { maximumFractionDigits: 3 });

  const breakdownRows: ReportBreakdownRow[] = rows.map((r) => ({
    id: `${r.warehouseId}:${r.productId}`,
    cells: [
      r.warehouseName,
      <span key="p">
        <div className="row-title">{r.productName}</div>
        <div className="row-sub">{r.productCode}</div>
      </span>,
      `${qtyFmt.format(r.qty)}${r.unit ? ` ${r.unit}` : ''}`,
      formatMoney(r.avgCost, tenant.locale, tenant.currency),
      formatMoney(r.value, tenant.locale, tenant.currency),
    ],
  }));

  const totalsRow =
    rows.length > 0
      ? [
          pickLabel({ en: 'Total', ru: 'Итого', tr: 'Toplam' }, tenant.locale),
          '',
          '',
          '',
          formatMoney(totalValue, tenant.locale, tenant.currency),
        ]
      : undefined;

  return {
    kpis,
    sections: [
      {
        kind: 'breakdown',
        title: {
          en: 'Stock by warehouse & product',
          ru: 'Остатки по складам и товарам',
          tr: 'Depo ve ürün bazlı stok',
        },
        columns: [
          { key: 'warehouse', label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' } },
          { key: 'product', label: { en: 'Product', ru: 'Товар', tr: 'Ürün' } },
          {
            key: 'qty',
            label: { en: 'Qty', ru: 'Кол-во', tr: 'Adet' },
            align: 'right',
          },
          {
            key: 'avgCost',
            label: { en: 'Avg cost', ru: 'Сред. себест.', tr: 'Ort. maliyet' },
            align: 'right',
          },
          {
            key: 'value',
            label: { en: 'Value', ru: 'Стоимость', tr: 'Değer' },
            align: 'right',
          },
        ],
        rows: breakdownRows,
        totalsRow,
      },
    ],
  };
}
