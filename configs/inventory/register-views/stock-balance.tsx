import { formatMoney } from '@/lib/format-money';
import {
  type Locale,
  type LocalizedLabel,
  type RegisterChipOption,
  type RegisterMatrixCell,
  type RegisterMatrixColumnHeader,
  type RegisterMatrixPayload,
  type RegisterMatrixRowHeader,
  type RegisterRow,
  type RegisterViewConfig,
  type RegisterViewKpi,
  type RegisterViewPayload,
  defineRegisterView,
} from '@/platform/metadata';

/**
 * Stock balance register view — matrix mode (product-prices parity).
 *
 * Layout: products as rows, warehouses + Toplam + Değer + Son Hareket as
 * matrix columns. Snapshot mode — `period.end - 1ms` is the asOf cutoff
 * for movement aggregation. Statement mode (period: açılış/giriş/çıkış/
 * kapanış) deferred to V1.
 *
 * Visual tags on cells:
 *  - `'zero'` → red `.pill-danger` (qty ≤ 0)
 *  - `'low'`  → yellow `.pill-warning` (0 < qty < product.minStock)
 *
 * Chip filter narrows ROWS (products with non-zero qty in selected
 * warehouse). Warehouse columns remain visible regardless of the chip.
 * Column visibility comes from URL ?cols= + sticky DB preference + the
 * loader's `defaultVisible` defaults. All warehouse columns are locked.
 */
export const stockBalanceView: RegisterViewConfig = defineViewSpec();

function defineViewSpec(): RegisterViewConfig {
  const config: RegisterViewConfig = {
    id: 'stock-balance',
    register: 'inventory.stock_balance',
    title: {
      en: 'Stock Balance',
      ru: 'Остатки товаров',
      tr: 'Stok Bakiyesi',
    },
    subtitleSecondary: { en: 'Stock Balance', ru: 'Остатки товаров', tr: 'Stok Bakiyesi' },
    countLabel: (n) => ({
      en: `${n} warehouses`,
      ru: `${n} складов`,
      tr: `${n} depo`,
    }),
    breadcrumb: {
      en: 'Registers / Stock Balance',
      ru: 'Регистры / Остатки товаров',
      tr: 'Kayıtlar / Stok Bakiyesi',
    },
    hubCard: {
      icon: 'boxes',
      description: {
        en: 'On-hand stock per product and warehouse.',
        ru: 'Остатки по товарам и складам.',
        tr: 'Ürün ve depo bazında mevcut stok.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    search: {
      placeholder: {
        en: 'Search SKU…',
        ru: 'Поиск SKU…',
        tr: 'SKU ara…',
      },
    },
    // Columns for the "Son Hareketler" entries list rendered below the matrix
    // — driven by `payload.rows`. Matrix mode + entries list coexist on the
    // same page (renderer renders matrix first, then list).
    columns: [
      { key: 'date', label: { en: 'Date', ru: 'Дата', tr: 'Tarih' } },
      { key: 'warehouse', label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' } },
      { key: 'product', label: { en: 'Product', ru: 'Товар', tr: 'Ürün' } },
      {
        key: 'direction',
        label: { en: 'Direction', ru: 'Тип', tr: 'Yön' },
      },
      { key: 'qty', label: { en: 'Qty', ru: 'Кол-во', tr: 'Miktar' }, align: 'right' },
      {
        key: 'totalCost',
        label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' },
        align: 'right',
      },
      { key: 'source', label: { en: 'Source', ru: 'Документ', tr: 'Kaynak' } },
    ],
    loader: loadStockBalance,
  };
  defineRegisterView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

async function loadStockBalance(
  ctx: Parameters<RegisterViewConfig['loader']>[0],
): Promise<RegisterViewPayload> {
  const { tx } = ctx;
  const asOf = new Date(ctx.period.end.getTime() - 1);

  const [incomeUpTo, expenseUpTo, lastMovementByProduct, products, warehouses] = await Promise.all([
    tx.movement_inventory_stock_balance.groupBy({
      by: ['product', 'warehouse'],
      where: { active: true, kind: 'income', timestamp: { lte: asOf } },
      _sum: { quantity: true, totalCost: true },
    }),
    tx.movement_inventory_stock_balance.groupBy({
      by: ['product', 'warehouse'],
      where: { active: true, kind: 'expense', timestamp: { lte: asOf } },
      _sum: { quantity: true },
    }),
    tx.movement_inventory_stock_balance.groupBy({
      by: ['product'],
      where: { active: true, timestamp: { lte: asOf } },
      _max: { timestamp: true },
    }),
    tx.catalog_inventory_product.findMany({
      where: { deletedAt: null },
      orderBy: [{ code: 'asc' }],
      select: { id: true, code: true, name: true, costPrice: true, minStock: true },
    }),
    tx.catalog_inventory_warehouse.findMany({
      where: { deletedAt: null },
      orderBy: [{ code: 'asc' }],
      select: { id: true, code: true, name: true },
    }),
  ]);

  // Aggregate balance per (product, warehouse) — income − expense
  const balanceByPair = new Map<string, number>();
  for (const r of incomeUpTo as Array<{
    product: string;
    warehouse: string;
    _sum: { quantity: number | null };
  }>) {
    const key = `${r.product}|${r.warehouse}`;
    balanceByPair.set(key, (balanceByPair.get(key) ?? 0) + Number(r._sum.quantity ?? 0));
  }
  for (const r of expenseUpTo as Array<{
    product: string;
    warehouse: string;
    _sum: { quantity: number | null };
  }>) {
    const key = `${r.product}|${r.warehouse}`;
    balanceByPair.set(key, (balanceByPair.get(key) ?? 0) - Number(r._sum.quantity ?? 0));
  }

  // Weighted-average purchase cost per product from income (receipt) movements'
  // captured totalCost. Used to value stock when the catalog costPrice is unset
  // — mirrors the Inventory Valuation report's cost basis so the two surfaces
  // agree (#23: register showed ₺0 because product.costPrice was null).
  const costAccByProduct = new Map<string, { cost: number; qty: number }>();
  for (const r of incomeUpTo as Array<{
    product: string;
    _sum: { quantity: number | null; totalCost: number | null };
  }>) {
    const acc = costAccByProduct.get(r.product) ?? { cost: 0, qty: 0 };
    acc.cost += Number(r._sum.totalCost ?? 0);
    acc.qty += Number(r._sum.quantity ?? 0);
    costAccByProduct.set(r.product, acc);
  }
  const avgCostByProduct = new Map<string, number>();
  for (const [pid, { cost, qty }] of costAccByProduct) {
    if (qty > 0 && cost > 0) avgCostByProduct.set(pid, cost / qty);
  }

  const lastByProduct = new Map<string, Date>();
  for (const r of lastMovementByProduct as Array<{
    product: string;
    _max: { timestamp: Date | null };
  }>) {
    if (r._max.timestamp) lastByProduct.set(r.product, r._max.timestamp);
  }

  // Only render products with movement history at/before asOf
  const productHasActivity = new Set<string>();
  for (const key of balanceByPair.keys()) {
    const [pid] = key.split('|');
    if (pid) productHasActivity.add(pid);
  }
  const allProducts = products.filter(
    (p) => productHasActivity.has(p.id) || lastByProduct.has(p.id),
  );

  // Search filter
  const productMatches = (() => {
    if (!ctx.search) return allProducts;
    const q = ctx.search.toLowerCase();
    return allProducts.filter(
      (p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  })();

  // Chip filter — narrows rows when a specific warehouse is selected
  const selectedWarehouseId =
    ctx.chip && ctx.chip !== 'all'
      ? (warehouses.find((w) => w.code === ctx.chip)?.id ?? null)
      : null;
  const visibleProducts = selectedWarehouseId
    ? productMatches.filter((p) => {
        const qty = balanceByPair.get(`${p.id}|${selectedWarehouseId}`) ?? 0;
        return Math.abs(qty) > 0.0005;
      })
    : productMatches;

  // ---------- COLUMNS ----------
  const warehouseSubtitle = pickLabel(
    { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
    ctx.tenant.locale,
  );
  const totalTitle = pickLabel({ en: 'Total', ru: 'Итого', tr: 'Toplam' }, ctx.tenant.locale);
  const valueTitle = pickLabel({ en: 'Value', ru: 'Стоимость', tr: 'Değer' }, ctx.tenant.locale);
  const lastMoveTitle = pickLabel(
    { en: 'Last Move', ru: 'Последнее движение', tr: 'Son Hareket' },
    ctx.tenant.locale,
  );
  const dateSubtitle = pickLabel({ en: 'Date', ru: 'Дата', tr: 'Tarih' }, ctx.tenant.locale);

  const columns: RegisterMatrixColumnHeader[] = [
    ...warehouses.map((w) => ({
      id: `wh:${w.id}`,
      code: `WH:${w.code}`,
      title: w.name,
      subtitle: warehouseSubtitle,
      locked: true,
      defaultVisible: true,
    })),
    {
      id: 'total',
      code: 'TOTAL',
      title: totalTitle,
      subtitle: 'Σ',
      locked: true,
      defaultVisible: true,
    },
    {
      id: 'val',
      code: 'VAL',
      title: valueTitle,
      subtitle: ctx.tenant.currency,
      locked: false,
      defaultVisible: true,
    },
    {
      id: 'last',
      code: 'LAST',
      title: lastMoveTitle,
      subtitle: dateSubtitle,
      locked: false,
      defaultVisible: true,
    },
  ];

  // ---------- ROWS ----------
  const rows: RegisterMatrixRowHeader[] = visibleProducts.map((p) => ({
    id: p.id,
    title: p.name,
    subtitle: p.code,
  }));

  // ---------- CELLS ----------
  const dateFmt = new Intl.DateTimeFormat(ctx.tenant.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const cells: RegisterMatrixCell[][] = visibleProducts.map((p) => {
    const rowCells: RegisterMatrixCell[] = [];
    const minStock = p.minStock ? Number(p.minStock) : 0;
    let total = 0;

    for (const w of warehouses) {
      const qty = balanceByPair.get(`${p.id}|${w.id}`) ?? 0;
      total += qty;
      let tag: 'low' | 'zero' | undefined;
      if (qty <= 0.0005) tag = 'zero';
      else if (minStock > 0 && qty < minStock) tag = 'low';
      rowCells.push({
        formatted: tag === 'zero' ? '0' : formatQty(qty),
        tag,
      });
    }

    rowCells.push({
      formatted: formatQty(total),
      tag: total <= 0.0005 ? 'zero' : undefined,
    });

    const cost = avgCostByProduct.get(p.id) ?? (p.costPrice ? Number(p.costPrice) : 0);
    rowCells.push({
      formatted:
        total > 0 && cost > 0
          ? formatMoney(total * cost, ctx.tenant.locale, ctx.tenant.currency)
          : null,
    });

    const lastTs = lastByProduct.get(p.id);
    rowCells.push({
      formatted: lastTs ? dateFmt.format(lastTs) : null,
    });

    return rowCells;
  });

  // ---------- KPIs ----------
  // All KPI counts are PER-PRODUCT (matching mockup semantics: "X SKU
  // düşük stoklu" not "X hücre düşük stoklu"). A product is "low" if
  // it has positive total but at least one warehouse below minStock.
  // A product is "zero" if its total qty across all warehouses ≤ 0.
  let totalValue = 0;
  let lowStockCount = 0;
  let zeroStockCount = 0;
  const activeSkus = new Set<string>();
  for (const p of allProducts) {
    const minStock = p.minStock ? Number(p.minStock) : 0;
    let productTotal = 0;
    let hasLowWarehouse = false;
    for (const w of warehouses) {
      const qty = balanceByPair.get(`${p.id}|${w.id}`) ?? 0;
      productTotal += qty;
      if (minStock > 0 && qty > 0.0005 && qty < minStock) hasLowWarehouse = true;
    }
    if (productTotal > 0.0005) {
      activeSkus.add(p.id);
      if (hasLowWarehouse) lowStockCount += 1;
    } else {
      zeroStockCount += 1;
    }
    const cost = avgCostByProduct.get(p.id) ?? (p.costPrice ? Number(p.costPrice) : 0);
    if (productTotal > 0 && cost > 0) totalValue += productTotal * cost;
  }

  const kpis: RegisterViewKpi[] = [
    {
      id: 'totalValue',
      label: { en: 'Total Stock Value', ru: 'Стоимость остатков', tr: 'Toplam Stok Değeri' },
      value: formatMoney(totalValue, ctx.tenant.locale, ctx.tenant.currency),
    },
    {
      id: 'activeSkus',
      label: { en: 'Active SKUs', ru: 'Активных SKU', tr: 'Aktif SKU' },
      value: String(activeSkus.size),
    },
    {
      id: 'lowStock',
      label: { en: 'Low Stock', ru: 'Низкий остаток', tr: 'Düşük Stoklu' },
      value: String(lowStockCount),
    },
    {
      id: 'zeroStock',
      label: { en: 'Out of Stock', ru: 'Нет на складе', tr: 'Sıfır Stoklu' },
      value: String(zeroStockCount),
    },
  ];

  // ---------- CHIPS ----------
  // Counts reflect the post-SEARCH product set so the chip total tracks
  // the table after a query — pre-search count would be misleading.
  const chips: RegisterChipOption[] = [
    {
      key: 'all',
      label: { en: 'All warehouses', ru: 'Все склады', tr: 'Tüm depolar' },
      count: productMatches.length,
    },
    ...warehouses.map((w) => ({
      key: w.code,
      label: { en: w.name, ru: w.name, tr: w.name },
      count: productMatches.filter((p) => {
        const qty = balanceByPair.get(`${p.id}|${w.id}`) ?? 0;
        return Math.abs(qty) > 0.0005;
      }).length,
    })),
  ];

  const matrix: RegisterMatrixPayload = {
    columns,
    rows,
    cells,
  };

  // ---------- ENTRIES LIST (rendered below the matrix) ----------
  // Last 25 stock movements within the selected period, joined with
  // product + warehouse for display. Source column tries to resolve the
  // doc_ref to a real document number; falls back to a short tag.
  const periodStart = ctx.period.start;
  const periodEnd = ctx.period.end;

  const entriesWhere: Record<string, unknown> = {
    active: true,
    timestamp: { gte: periodStart, lt: periodEnd },
  };
  if (selectedWarehouseId) {
    entriesWhere.warehouse = selectedWarehouseId;
  }

  const productIdsInRows = new Set(visibleProducts.map((p) => p.id));
  if (ctx.search) {
    // Restrict entries to the searched product set
    entriesWhere.product = { in: Array.from(productIdsInRows) };
  }

  const entryMovements = await tx.movement_inventory_stock_balance.findMany({
    where: entriesWhere,
    orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
    take: 25,
    select: {
      id: true,
      timestamp: true,
      product: true,
      warehouse: true,
      kind: true,
      quantity: true,
      totalCost: true,
      docRef: true,
      docType: true,
    },
  });

  const totalEntryCount = await tx.movement_inventory_stock_balance.count({
    where: entriesWhere,
  });

  const productById = new Map(products.map((p) => [p.id, p]));
  const warehouseById = new Map(warehouses.map((w) => [w.id, w]));

  // Resolve doc_ref → human-readable source per doc_type. For real docs
  // we batch-lookup their number; demo-seed entries get a short tag.
  const salesInvoiceRefs = entryMovements
    .filter((m) => m.docType === 'sales.sales_invoice')
    .map((m) => m.docRef);
  const purchaseInvoiceRefs = entryMovements
    .filter((m) => m.docType === 'purchases.purchase_invoice')
    .map((m) => m.docRef);

  const [salesInvoices, purchaseInvoices] = await Promise.all([
    salesInvoiceRefs.length > 0
      ? tx.document_sales_invoice.findMany({
          where: { id: { in: salesInvoiceRefs } },
          select: { id: true, number: true },
        })
      : Promise.resolve([] as Array<{ id: string; number: string }>),
    purchaseInvoiceRefs.length > 0
      ? tx.document_purchases_invoice.findMany({
          where: { id: { in: purchaseInvoiceRefs } },
          select: { id: true, number: true },
        })
      : Promise.resolve([] as Array<{ id: string; number: string }>),
  ]);

  const docNumberByRef = new Map<string, string>();
  for (const d of salesInvoices) docNumberByRef.set(d.id, d.number);
  for (const d of purchaseInvoices) docNumberByRef.set(d.id, d.number);

  const dateTimeFmt = new Intl.DateTimeFormat(ctx.tenant.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  const directionLabels = {
    income: pickLabel({ en: 'In', ru: 'Приход', tr: 'Giriş' }, ctx.tenant.locale),
    expense: pickLabel({ en: 'Out', ru: 'Расход', tr: 'Çıkış' }, ctx.tenant.locale),
  };

  const entryRows: RegisterRow[] = entryMovements.map((m) => {
    const p = productById.get(m.product);
    const w = warehouseById.get(m.warehouse);
    const qty = Number(m.quantity);
    const totalCost = Number(m.totalCost);
    const isIncome = m.kind === 'income';
    const docNumber = docNumberByRef.get(m.docRef);
    const source = docNumber
      ? docNumber
      : m.docType === 'demo_seed_stock_balance'
        ? pickLabel({ en: 'Demo seed', ru: 'Демо', tr: 'Demo' }, ctx.tenant.locale)
        : m.docType;
    return {
      id: m.id,
      cells: [
        dateTimeFmt.format(m.timestamp),
        w ? (
          <span key="w" className="pill pill-neutral">
            {w.name}
          </span>
        ) : (
          '—'
        ),
        <span key="p">
          <div className="row-title">{p?.name ?? '—'}</div>
          {p?.code ? <div className="row-sub">{p.code}</div> : null}
        </span>,
        isIncome ? (
          <span key="d" className="pill pill-success">
            {directionLabels.income}
          </span>
        ) : (
          <span key="d" className="pill pill-warning">
            {directionLabels.expense}
          </span>
        ),
        `${isIncome ? '+' : '−'}${qty}`,
        formatMoney(totalCost, ctx.tenant.locale, ctx.tenant.currency),
        <span key="s" className="mono" style={{ fontSize: 12 }}>
          {source}
        </span>,
      ],
    };
  });

  const payload: RegisterViewPayload = {
    kpis,
    chips,
    rows: entryRows,
    totalCount: totalEntryCount,
    subtitleCount: warehouses.length,
    matrix,
  };
  return payload;
}

/** Format a quantity — drops trailing zeros, keeps up to 3 decimal places. */
function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return Number.parseFloat(n.toFixed(3)).toString();
}
