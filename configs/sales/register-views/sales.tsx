import { formatMoney } from '@/lib/format-money';
import { formatDelta, priorPeriod } from '@/platform/engine/kpi-delta';
import { Link } from '@/platform/i18n/navigation';
import {
  type RegisterChipOption,
  type RegisterRow,
  type RegisterViewConfig,
  type RegisterViewKpi,
  type RegisterViewPayload,
  defineRegisterView,
} from '@/platform/metadata';

const PAGE_SIZE = 25;

/**
 * Sales register view — variant-9 parity (mockup: satis.html).
 *
 * One row per active income line of `movement_sales_sale`, filtered to
 * the selected period. KPIs compute totals across the same period plus
 * top-product / top-customer ranking. KPI #1 + #2 get period-over-
 * period delta via `priorPeriod` + `formatDelta`.
 */
export const salesView: RegisterViewConfig = defineViewSpec();

function defineViewSpec(): RegisterViewConfig {
  const config: RegisterViewConfig = {
    id: 'sales',
    register: 'sales.sale',
    title: { en: 'Sales', ru: 'Продажи', tr: 'Satış' },
    subtitleSecondary: { en: 'Sales', ru: 'Продажи', tr: 'Satış' },
    countLabel: (n) => ({
      en: `${n} movements`,
      ru: `${n} движений`,
      tr: `${n} hareket`,
    }),
    breadcrumb: {
      en: 'Registers / Sales',
      ru: 'Регистры / Продажи',
      tr: 'Kayıtlar / Satış',
    },
    hubCard: {
      icon: 'bar-chart-3',
      description: {
        en: 'Posted sale movements with revenue and cost.',
        ru: 'Проведённые продажи с выручкой и себестоимостью.',
        tr: 'Geçirilmiş satış hareketleri (ciro + maliyet).',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    search: {
      placeholder: {
        en: 'Product or customer…',
        ru: 'Товар или клиент…',
        tr: 'Ürün veya müşteri…',
      },
    },
    columns: [
      { key: 'date', label: { en: 'Date', ru: 'Дата', tr: 'Tarih' } },
      { key: 'customer', label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' } },
      { key: 'product', label: { en: 'Product', ru: 'Товар', tr: 'Ürün' } },
      { key: 'qty', label: { en: 'Qty', ru: 'Кол-во', tr: 'Adet' }, align: 'right' },
      { key: 'price', label: { en: 'Price', ru: 'Цена', tr: 'Fiyat' }, align: 'right' },
      { key: 'amount', label: { en: 'Amount', ru: 'Сумма', tr: 'Tutar' }, align: 'right' },
      { key: 'doc', label: { en: 'Document', ru: 'Документ', tr: 'Belge' } },
    ],
    loader: loadSales,
  };
  defineRegisterView(config);
  return config;
}

async function loadSales(
  ctx: Parameters<RegisterViewConfig['loader']>[0],
): Promise<RegisterViewPayload> {
  const { tx } = ctx;
  const prior = priorPeriod(ctx.period);

  const startOfWeek = new Date();
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 7);

  const baseWhere = { active: true, kind: 'income' as const };
  const periodWhere = {
    ...baseWhere,
    timestamp: { gte: ctx.period.start, lt: ctx.period.end },
  };
  const priorWhere = {
    ...baseWhere,
    timestamp: { gte: prior.start, lt: prior.end },
  };

  const [periodAgg, priorAgg, allInPeriod, recent, totalCount, weekCount, canceledCount] =
    await Promise.all([
      tx.movement_sales_sale.aggregate({
        where: periodWhere,
        _sum: { revenue: true, cost: true },
      }),
      tx.movement_sales_sale.aggregate({
        where: priorWhere,
        _sum: { revenue: true, cost: true },
      }),
      tx.movement_sales_sale.findMany({
        where: periodWhere,
        select: {
          counterparty: true,
          product: true,
          quantity: true,
          revenue: true,
          cost: true,
        },
      }),
      tx.movement_sales_sale.findMany({
        where: periodWhere,
        orderBy: { timestamp: 'desc' },
        take: PAGE_SIZE,
        select: {
          id: true,
          docRef: true,
          timestamp: true,
          counterparty: true,
          product: true,
          quantity: true,
          revenue: true,
          cost: true,
        },
      }),
      tx.movement_sales_sale.count({ where: periodWhere }),
      tx.movement_sales_sale.count({
        where: { ...baseWhere, timestamp: { gte: startOfWeek } },
      }),
      tx.movement_sales_sale.count({ where: { active: false, kind: 'income' } }),
    ]);

  const periodRevenue = Number(periodAgg._sum.revenue ?? 0);
  const periodCost = Number(periodAgg._sum.cost ?? 0);
  const periodProfit = periodRevenue - periodCost;
  const priorRevenue = Number(priorAgg._sum.revenue ?? 0);
  const priorProfit = priorRevenue - Number(priorAgg._sum.cost ?? 0);

  const revenueDelta = formatDelta(periodRevenue, priorRevenue, ctx.tenant.locale);
  const profitDelta = formatDelta(periodProfit, priorProfit, ctx.tenant.locale);

  // Top product + top customer over period
  const revByProduct = new Map<string, { revenue: number; quantity: number }>();
  const revByCustomer = new Map<string, number>();
  for (const m of allInPeriod as Array<{
    counterparty: string;
    product: string;
    quantity: number;
    revenue: unknown;
  }>) {
    const rev = Number(m.revenue);
    const prev = revByProduct.get(m.product) ?? { revenue: 0, quantity: 0 };
    revByProduct.set(m.product, {
      revenue: prev.revenue + rev,
      quantity: prev.quantity + Number(m.quantity),
    });
    revByCustomer.set(m.counterparty, (revByCustomer.get(m.counterparty) ?? 0) + rev);
  }
  let topProductId: string | null = null;
  let topProductRev = 0;
  let topProductQty = 0;
  for (const [pid, v] of revByProduct) {
    if (v.revenue > topProductRev) {
      topProductRev = v.revenue;
      topProductQty = v.quantity;
      topProductId = pid;
    }
  }
  let topCustomerId: string | null = null;
  let topCustomerRev = 0;
  for (const [cid, rev] of revByCustomer) {
    if (rev > topCustomerRev) {
      topCustomerRev = rev;
      topCustomerId = cid;
    }
  }

  // Resolve doc + product + customer names for recent rows
  const docIds = Array.from(new Set(recent.map((r) => r.docRef)));
  const productIds = Array.from(
    new Set([...recent.map((r) => r.product), topProductId].filter(Boolean) as string[]),
  );
  const customerIds = Array.from(
    new Set([...recent.map((r) => r.counterparty), topCustomerId].filter(Boolean) as string[]),
  );

  const [docs, products, customers] = await Promise.all([
    docIds.length
      ? tx.document_sales_invoice.findMany({
          where: { id: { in: docIds } },
          select: { id: true, number: true },
        })
      : Promise.resolve([]),
    productIds.length
      ? tx.catalog_inventory_product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, code: true },
        })
      : Promise.resolve([]),
    customerIds.length
      ? tx.catalog_sales_customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const docNumberById = new Map(
    (docs as Array<{ id: string; number: string }>).map((d) => [d.id, d.number]),
  );
  const productById = new Map(
    (products as Array<{ id: string; name: string; code: string }>).map((p) => [p.id, p]),
  );
  const customerById = new Map(
    (customers as Array<{ id: string; name: string }>).map((c) => [c.id, c]),
  );

  const kpis: RegisterViewKpi[] = [
    {
      id: 'periodRevenue',
      label: {
        en: 'Sales This Period',
        ru: 'Продажи за период',
        tr: 'Dönem Satışı',
      },
      value: formatMoney(periodRevenue, ctx.tenant.locale, ctx.tenant.currency),
      ...(revenueDelta
        ? {
            delta: {
              direction: revenueDelta.direction,
              formatted: revenueDelta.formatted,
              note: { en: 'vs prior', ru: 'мес.', tr: 'Aylık' },
            },
          }
        : {}),
    },
    {
      id: 'periodProfit',
      label: {
        en: 'Net Profit This Period',
        ru: 'Чистая прибыль',
        tr: 'Dönem Net Kar',
      },
      value: formatMoney(periodProfit, ctx.tenant.locale, ctx.tenant.currency),
      ...(profitDelta
        ? {
            delta: {
              direction: profitDelta.direction,
              formatted: profitDelta.formatted,
              note: { en: 'vs prior', ru: 'мес.', tr: 'Aylık' },
            },
          }
        : {}),
    },
    {
      id: 'topProduct',
      label: { en: 'Top Seller', ru: 'Топ продукт', tr: 'En Çok Satan' },
      value: topProductId ? (productById.get(topProductId)?.name ?? topProductId) : '—',
    },
    {
      id: 'topCustomer',
      label: { en: 'Top Customer', ru: 'Топ клиент', tr: 'En Değerli Müşteri' },
      value: topCustomerId ? (customerById.get(topCustomerId)?.name ?? topCustomerId) : '—',
    },
  ];

  const chips: RegisterChipOption[] = [
    {
      key: 'all',
      label: { en: 'All', ru: 'Все', tr: 'Tümü' },
      count: totalCount,
    },
    {
      key: 'this-week',
      label: { en: 'This Week', ru: 'На этой неделе', tr: 'Bu hafta' },
      count: weekCount,
    },
    {
      key: 'this-month',
      label: { en: 'This Month', ru: 'В этом месяце', tr: 'Bu ay' },
      count: totalCount,
    },
    {
      key: 'canceled',
      label: { en: 'Canceled', ru: 'Отменено', tr: 'İptal' },
      count: canceledCount,
    },
  ];

  const dateFmt = new Intl.DateTimeFormat(ctx.tenant.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  let recentFiltered = recent;
  if (ctx.search) {
    const q = ctx.search.toLowerCase();
    recentFiltered = recent.filter((m) => {
      const p = productById.get(m.product);
      const c = customerById.get(m.counterparty);
      return (
        (p?.name.toLowerCase().includes(q) ?? false) ||
        (p?.code.toLowerCase().includes(q) ?? false) ||
        (c?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }

  const rows: RegisterRow[] = recentFiltered.map((m) => {
    const product = productById.get(m.product);
    const customer = customerById.get(m.counterparty);
    const qty = Number(m.quantity);
    const revenue = Number(m.revenue);
    const unitPrice = qty > 0 ? revenue / qty : 0;
    return {
      id: m.id,
      cells: [
        dateFmt.format(m.timestamp),
        customer?.name ?? '—',
        <span key="p">
          <div className="row-title">{product?.name ?? '—'}</div>
          {product?.code ? <div className="row-sub">{product.code}</div> : null}
        </span>,
        String(qty),
        formatMoney(unitPrice, ctx.tenant.locale, ctx.tenant.currency),
        formatMoney(revenue, ctx.tenant.locale, ctx.tenant.currency),
        docNumberById.get(m.docRef) ? (
          <Link key="d" href={`/documents/sales-invoice/${m.docRef}`} className="card-link mono">
            {docNumberById.get(m.docRef)}
          </Link>
        ) : (
          '—'
        ),
      ],
    };
  });

  const payload: RegisterViewPayload = {
    kpis,
    chips,
    rows,
    totalCount,
    subtitleCount: totalCount,
  };
  // expose ranked extras (topProductQty + topCustomerRev) for future
  // KPI sub-text wiring without re-querying.
  void topProductQty;
  void topCustomerRev;
  return payload;
}
