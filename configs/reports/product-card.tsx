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
 * Product Card — per-product summary over the selected period.
 * For every product with stock activity in [period.start, period.end):
 *   - opening qty (running balance at period.start)
 *   - in qty / out qty (period income / expense)
 *   - closing qty
 *   - period avg cost
 *
 * Mirrors 1C "Карточка номенклатуры" but rolled up to one row per product
 * for a quick at-a-glance answer; click-through to the per-product timeline
 * is future work (uses /v2/registers/stock-balance with product filter today).
 */
export const productCardReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'product-card',
    title: {
      en: 'Product Card',
      ru: 'Карточка номенклатуры',
      tr: 'Ürün Kartı',
    },
    subtitleSecondary: {
      en: 'Product card',
      ru: 'Карточка номенклатуры',
      tr: 'Ürün kartı',
    },
    breadcrumb: {
      en: 'Reports / Product Card',
      ru: 'Отчёты / Карточка номенклатуры',
      tr: 'Raporlar / Ürün Kartı',
    },
    section: {
      en: 'Inventory',
      ru: 'Склад',
      tr: 'Stok',
    },
    hubCard: {
      icon: 'boxes',
      description: {
        en: 'Per-product opening / in / out / closing & period avg cost.',
        ru: 'Сальдо / приход / расход / остаток и средняя себестоимость по товарам.',
        tr: 'Ürün bazlı açılış / giriş / çıkış / kapanış ve dönem ort. maliyeti.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    search: {
      placeholder: { en: 'Search product…', ru: 'Поиск товара…', tr: 'Ürün ara…' },
    },
    loader: loadProductCard,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

async function loadProductCard(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, period, tenant, search } = ctx;

  // Pull every active stock movement up to period.end. We split by
  // pre-period (rolls into opening) vs in-period (income/expense).
  const movements = (await tx.movement_inventory_stock_balance.findMany({
    where: { active: true, timestamp: { lt: period.end } },
    select: { product: true, kind: true, quantity: true, totalCost: true, timestamp: true },
  })) as Array<{
    product: string;
    kind: string;
    quantity: unknown;
    totalCost: unknown;
    timestamp: Date;
  }>;

  type Bucket = {
    openingQty: number;
    openingCost: number;
    inQty: number;
    inCost: number;
    outQty: number;
    outCost: number;
  };
  const buckets = new Map<string, Bucket>();

  for (const m of movements) {
    const b = buckets.get(m.product) ?? {
      openingQty: 0,
      openingCost: 0,
      inQty: 0,
      inCost: 0,
      outQty: 0,
      outCost: 0,
    };
    const q = Number(m.quantity ?? 0);
    const tc = Number(m.totalCost ?? 0);
    const isIncome = m.kind === 'income';
    const signed = isIncome ? 1 : -1;
    if (m.timestamp < period.start) {
      b.openingQty += signed * q;
      b.openingCost += signed * tc;
    } else if (isIncome) {
      b.inQty += q;
      b.inCost += tc;
    } else {
      b.outQty += q;
      b.outCost += tc;
    }
    buckets.set(m.product, b);
  }

  // Hydrate products. Apply ?q= search filter.
  const productIds = [...buckets.keys()];
  const products = productIds.length
    ? await tx.catalog_inventory_product.findMany({
        where: { id: { in: productIds }, deletedAt: null },
        select: { id: true, name: true, code: true, unit: true },
      })
    : [];
  const prodById = new Map(products.map((p) => [p.id, p]));

  type Row = {
    id: string;
    name: string;
    code: string;
    unit: string;
    openingQty: number;
    inQty: number;
    inCost: number;
    outQty: number;
    outCost: number;
    closingQty: number;
    avgCost: number;
  };
  const rows: Row[] = [];
  for (const [pid, b] of buckets) {
    const closingQty = b.openingQty + b.inQty - b.outQty;
    // Skip products with no activity AND zero opening AND zero closing.
    if (b.inQty === 0 && b.outQty === 0 && Math.abs(b.openingQty) < 0.0001) continue;
    const closingCost = b.openingCost + b.inCost - b.outCost;
    const p = prodById.get(pid);
    const name = p?.name ?? pid.slice(0, 8);
    if (search && !name.toLowerCase().includes(search.toLowerCase())) continue;
    rows.push({
      id: pid,
      name,
      code: p?.code ?? '',
      unit: p?.unit ?? '',
      openingQty: b.openingQty,
      inQty: b.inQty,
      inCost: b.inCost,
      outQty: b.outQty,
      outCost: b.outCost,
      closingQty,
      avgCost: closingQty > 0 ? closingCost / closingQty : 0,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));

  // KPIs
  const totalIn = rows.reduce((s, r) => s + r.inQty, 0);
  const totalOut = rows.reduce((s, r) => s + r.outQty, 0);
  const totalInCost = rows.reduce((s, r) => s + r.inCost, 0);
  const totalOutCost = rows.reduce((s, r) => s + r.outCost, 0);

  const qtyFmt = new Intl.NumberFormat(tenant.locale, { maximumFractionDigits: 3 });
  const kpis: ReportKpiCard[] = [
    {
      id: 'productCount',
      label: {
        en: 'Products with activity',
        ru: 'Активных позиций',
        tr: 'Hareketli Ürün',
      },
      value: String(rows.length),
    },
    {
      id: 'inQty',
      label: { en: 'Total received', ru: 'Приход', tr: 'Toplam Giriş' },
      value: qtyFmt.format(totalIn),
      tone: 'positive',
    },
    {
      id: 'outQty',
      label: { en: 'Total shipped', ru: 'Расход', tr: 'Toplam Çıkış' },
      value: qtyFmt.format(totalOut),
      tone: 'negative',
    },
    {
      id: 'turnoverCost',
      label: {
        en: 'Cost of goods moved',
        ru: 'Себестоимость движения',
        tr: 'Hareket Maliyeti',
      },
      value: formatMoney(totalInCost + totalOutCost, tenant.locale, tenant.currency),
    },
  ];

  const breakdownRows: ReportBreakdownRow[] = rows.map((r) => ({
    id: r.id,
    cells: [
      <span key="n">
        <div className="row-title">{r.name}</div>
        <div className="row-sub">{r.code}</div>
      </span>,
      `${qtyFmt.format(r.openingQty)}${r.unit ? ` ${r.unit}` : ''}`,
      qtyFmt.format(r.inQty),
      qtyFmt.format(r.outQty),
      `${qtyFmt.format(r.closingQty)}${r.unit ? ` ${r.unit}` : ''}`,
      formatMoney(r.avgCost, tenant.locale, tenant.currency),
    ],
  }));

  const totalsRow =
    rows.length > 0
      ? [
          pickLabel({ en: 'Total', ru: 'Итого', tr: 'Toplam' }, tenant.locale),
          '',
          qtyFmt.format(totalIn),
          qtyFmt.format(totalOut),
          '',
          '',
        ]
      : undefined;

  return {
    kpis,
    sections: [
      {
        kind: 'breakdown',
        title: {
          en: 'Product movement summary',
          ru: 'Сводка по товарам',
          tr: 'Ürün hareket özeti',
        },
        columns: [
          { key: 'product', label: { en: 'Product', ru: 'Товар', tr: 'Ürün' } },
          {
            key: 'opening',
            label: { en: 'Opening', ru: 'Сальдо нач.', tr: 'Açılış' },
            align: 'right',
          },
          {
            key: 'in',
            label: { en: 'In', ru: 'Приход', tr: 'Giriş' },
            align: 'right',
          },
          {
            key: 'out',
            label: { en: 'Out', ru: 'Расход', tr: 'Çıkış' },
            align: 'right',
          },
          {
            key: 'closing',
            label: { en: 'Closing', ru: 'Сальдо кон.', tr: 'Kapanış' },
            align: 'right',
          },
          {
            key: 'avgCost',
            label: { en: 'Avg cost', ru: 'Сред. себест.', tr: 'Ort. maliyet' },
            align: 'right',
          },
        ],
        rows: breakdownRows,
        totalsRow,
      },
    ],
  };
}
