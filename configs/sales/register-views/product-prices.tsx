import { formatMoney } from '@/lib/format-money';
import { getProductAvgCost, resolvePriceForType } from '@/platform/engine/pricing';
import {
  type RegisterMatrixCell,
  type RegisterMatrixColumnHeader,
  type RegisterMatrixPayload,
  type RegisterMatrixRowHeader,
  type RegisterViewConfig,
  type RegisterViewKpi,
  type RegisterViewPayload,
  defineRegisterView,
  getRegistry,
} from '@/platform/metadata';
import { pickLabel } from '@/platform/metadata/shared';

/**
 * Product Prices register view — variant-9 parity
 * (mockup: urun-fiyatlari.html).
 *
 * Matrix layout: rows = products, columns = price types. Each cell
 * resolves the as-of-period price for that (product, type) pair via
 * the 1C-style `resolvePriceForType` resolver (static → snapshot from
 * inventory.product_price, dynamic → formula derivation).
 *
 * Cost column is a virtual prepend showing the live average cost from the
 * stock register (inventory.stock_balance) — the same source the sales price
 * resolver and document cost path use.
 *
 * The cost column is the locked anchor (always visible); every tenant-defined
 * price type is visible by default and can be hidden via the column bar.
 */
export const productPricesView: RegisterViewConfig = defineViewSpec();

function defineViewSpec(): RegisterViewConfig {
  const config: RegisterViewConfig = {
    id: 'product-prices',
    register: 'inventory.product_price',
    title: { en: 'Product Prices', ru: 'Цены номенклатуры', tr: 'Ürün Fiyatları' },
    subtitleSecondary: { en: 'Product Prices', ru: 'Цены номенклатуры', tr: 'Ürün Fiyatları' },
    countLabel: (n) => ({
      en: `${n} products`,
      ru: `${n} товаров`,
      tr: `${n} ürün`,
    }),
    breadcrumb: {
      en: 'Registers / Product Prices',
      ru: 'Регистры / Цены номенклатуры',
      tr: 'Kayıtlar / Ürün Fiyatları',
    },
    hubCard: {
      icon: 'wallet',
      description: {
        en: 'Latest price per product across all price types.',
        ru: 'Актуальные цены по типам цен для всех товаров.',
        tr: 'Tüm fiyat tiplerinde ürün başına güncel fiyat.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    search: {
      placeholder: {
        en: 'Search product…',
        ru: 'Поиск товара…',
        tr: 'Ürün ara…',
      },
    },
    columns: [], // matrix mode — config-level columns unused
    loader: loadProductPrices,
  };
  defineRegisterView(config);
  return config;
}

async function loadProductPrices(
  ctx: Parameters<RegisterViewConfig['loader']>[0],
): Promise<RegisterViewPayload> {
  const { tx } = ctx;
  const stockRegister = getRegistry().accumulationRegister['inventory.stock_balance'];
  const asOfDate = ctx.period.end;
  // Width is 23.5h (last second of period.end-day) — period.end is exclusive,
  // so resolvePriceForType sees the start of the next period if we pass it
  // raw. Step back 1 ms to land inside the selected period.
  const asOf = new Date(asOfDate.getTime() - 1);

  const [products, priceTypes] = await Promise.all([
    tx.catalog_inventory_product.findMany({
      where: { deletedAt: null },
      orderBy: [{ code: 'asc' }],
      select: { id: true, code: true, name: true },
    }),
    tx.catalog_sales_price_type.findMany({
      where: { deletedAt: null },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        kind: true,
        markupPct: true,
        basePriceType: true,
      },
    }),
  ]);

  const productMatches = (() => {
    if (!ctx.search) return products;
    const q = ctx.search.toLowerCase();
    return products.filter(
      (p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  })();

  // Build columns: virtual Maliyet first, then price types.
  const slugify = (s: string): string =>
    s
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 8);

  type EnrichedColumn = RegisterMatrixColumnHeader & {
    /** null = virtual cost column, otherwise the real price-type record. */
    priceType: { id: string; kind: string } | null;
  };

  const columns: EnrichedColumn[] = [
    {
      id: 'cost',
      code: 'CST',
      title: ((): string => {
        if (ctx.tenant.locale === 'tr') return 'Maliyet';
        if (ctx.tenant.locale === 'ru') return 'Себестоимость';
        return 'Cost';
      })(),
      subtitle: 'CST',
      locked: true,
      defaultVisible: true,
      priceType: null,
    },
  ];

  for (const pt of priceTypes) {
    const code = (pt.code ?? slugify(pt.name)) || pt.id.slice(0, 6);
    let subtitle: string | undefined;
    if (pt.kind === 'dynamic') {
      const pct = pt.markupPct === null ? null : Number(pt.markupPct);
      const sign = pct !== null && pct >= 0 ? '+' : '';
      const pctStr = pct === null ? '?' : `${sign}${(pct * 100).toFixed(0)}%`;
      const prefix = pt.basePriceType
        ? pickLabel(
            { en: 'Dynamic · base', ru: 'Динамич. · база', tr: 'Dinamik · taban' },
            ctx.tenant.locale,
          )
        : pickLabel(
            { en: 'Dynamic · cost', ru: 'Динамич. · с/с', tr: 'Dinamik · maliyet' },
            ctx.tenant.locale,
          );
      subtitle = `${prefix}${pctStr}`;
    } else {
      subtitle = pickLabel({ en: 'Static', ru: 'Статич.', tr: 'Statik' }, ctx.tenant.locale);
    }
    columns.push({
      id: `pt:${pt.id}`,
      code,
      title: pt.name,
      subtitle,
      locked: false,
      defaultVisible: true,
      priceType: { id: pt.id, kind: pt.kind },
    });
  }

  // Build rows.
  const rows: RegisterMatrixRowHeader[] = productMatches.map((p) => ({
    id: p.id,
    title: p.name,
    subtitle: p.code,
  }));

  // Build cells — [rowIdx][colIdx]. Numeric values are also stashed so the
  // KPI loop (avgMargin) can reuse them without re-resolving.
  const cells: RegisterMatrixCell[][] = [];
  const listColCode = 'PRC';
  const listValByProduct = new Map<string, number>();
  const costByProduct = new Map<string, number | null>();
  for (const product of productMatches) {
    const rowCells: RegisterMatrixCell[] = [];
    // Live average cost from stock movements — same source the sales resolver
    // and document cost path use. `product.costPrice` is a formHidden master-
    // data field that nothing populates, so reading it left Maliyet empty for
    // every real tenant.
    const liveCost = stockRegister
      ? (await getProductAvgCost(tx, stockRegister, product.id)).cost
      : 0;
    const costNum = liveCost > 0 ? liveCost : null;
    costByProduct.set(product.id, costNum);
    for (const col of columns) {
      if (col.priceType === null) {
        // Cost column
        rowCells.push({
          formatted:
            costNum !== null && costNum > 0
              ? formatMoney(costNum, ctx.tenant.locale, ctx.tenant.currency)
              : null,
          tag: 'cost',
        });
        continue;
      }
      // Price-type column — call resolver.
      let value: number | null = null;
      try {
        value = await resolvePriceForType(
          tx,
          ctx.tenant.id,
          product.id,
          asOf,
          col.priceType.id,
          new Set(),
          costNum && costNum > 0 ? { liveCost: costNum } : undefined,
        );
      } catch {
        value = null;
      }
      if (value !== null && value > 0 && col.code === listColCode) {
        listValByProduct.set(product.id, value);
      }
      rowCells.push({
        formatted:
          value !== null && value > 0
            ? formatMoney(value, ctx.tenant.locale, ctx.tenant.currency)
            : null,
        tag: col.priceType.kind === 'dynamic' ? 'l2' : undefined,
      });
    }
    cells.push(rowCells);
  }

  // Strip the helper `priceType` field — RegisterMatrixColumnHeader doesn't
  // include it.
  const finalColumns: RegisterMatrixColumnHeader[] = columns.map(
    ({ priceType: _pt, ...rest }) => rest,
  );

  const matrix: RegisterMatrixPayload = {
    columns: finalColumns,
    rows,
    cells,
  };

  // KPIs — simple counts. Bu Ay Değişen Fiyat: distinct (product, priceType)
  // pairs with at least one record this month.
  const activeTypesCount = priceTypes.length;
  const startOfMonth = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));
  const changedThisMonthRows = await tx.register_inventory_product_price.groupBy({
    by: ['product', 'priceType'],
    where: { period: { gte: startOfMonth } },
  });
  const changedThisMonth = changedThisMonthRows.length;

  // Average margin = (list − cost)/list across products with both. Reuses
  // list values stashed during cell build (no re-resolve).
  let marginSum = 0;
  let marginN = 0;
  for (const product of productMatches) {
    const costNum = costByProduct.get(product.id);
    if (costNum == null || costNum <= 0) continue;
    const listVal = listValByProduct.get(product.id);
    if (listVal === undefined || listVal <= 0) continue;
    marginSum += (listVal - costNum) / listVal;
    marginN += 1;
  }
  const avgMarginPct = marginN > 0 ? (marginSum / marginN) * 100 : null;

  // Son Değişiklik — latest period in register + corresponding doc number.
  const lastChange = await tx.register_inventory_product_price.findFirst({
    orderBy: { period: 'desc' },
    select: { period: true, docRef: true },
  });
  let lastChangeFormatted = '—';
  let lastChangeDocNumber = '';
  if (lastChange) {
    const dateFmt = new Intl.DateTimeFormat(ctx.tenant.locale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
    lastChangeFormatted = dateFmt.format(lastChange.period);
    if (lastChange.docRef) {
      const doc = await tx.document_inventory_price_setting.findUnique({
        where: { id: lastChange.docRef },
        select: { number: true },
      });
      lastChangeDocNumber = doc?.number ?? '';
    }
  }

  const kpis: RegisterViewKpi[] = [
    {
      id: 'activeTypes',
      label: {
        en: 'Active Price Types',
        ru: 'Активных типов цен',
        tr: 'Aktif Fiyat Tipi',
      },
      value: String(activeTypesCount),
    },
    {
      id: 'changedThisMonth',
      label: {
        en: 'Prices Changed This Month',
        ru: 'Цен изменено за месяц',
        tr: 'Bu Ay Değişen Fiyat',
      },
      value: String(changedThisMonth),
    },
    {
      id: 'avgMargin',
      label: {
        en: 'Average Margin',
        ru: 'Средняя маржа',
        tr: 'Ortalama Marj',
      },
      value: avgMarginPct !== null ? `${avgMarginPct.toFixed(1)}%` : '—',
    },
    {
      id: 'lastChange',
      label: {
        en: 'Last Change',
        ru: 'Последнее изменение',
        tr: 'Son Değişiklik',
      },
      value: lastChangeFormatted,
      ...(lastChangeDocNumber
        ? {
            delta: {
              direction: 'up',
              formatted: lastChangeDocNumber,
              note: { en: '', ru: '', tr: '' },
            },
          }
        : {}),
    },
  ];

  const payload: RegisterViewPayload = {
    kpis,
    chips: [],
    rows: [],
    totalCount: productMatches.length,
    subtitleCount: productMatches.length,
    matrix,
  };
  return payload;
}
