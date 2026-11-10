import { formatMoney } from '@/lib/format-money';
import {
  type Locale,
  type LocalizedLabel,
  type ReportBreakdownRow,
  type ReportKpiCard,
  type ReportRankedItem,
  type ReportViewConfig,
  type ReportViewPayload,
  defineReportView,
} from '@/platform/metadata';

/**
 * Top Customers report — ranks the tenant's top 10 customers for the period
 * by one of three measures (chip switch): revenue / profit / invoice count.
 *
 * Data source: `movement_sales_sale` (groupBy counterparty) joined with
 * `catalog_sales_customer` for display names. YoY% is computed by querying
 * the same period one year earlier for the same customer ids.
 */
export const topCustomersReportView: ReportViewConfig = defineViewSpec();

function defineViewSpec(): ReportViewConfig {
  const config: ReportViewConfig = {
    id: 'top-customers',
    title: {
      en: 'Top Customers',
      ru: 'Топ клиентов',
      tr: 'Top Müşteriler',
    },
    subtitleSecondary: {
      en: 'Top 10 customers · by revenue',
      ru: 'Топ-10 клиентов · по выручке',
      tr: 'İlk 10 müşteri · ciroya göre',
    },
    countLabel: (n) => ({
      en: `${n} customers`,
      ru: `${n} клиентов`,
      tr: `${n} müşteri`,
    }),
    breadcrumb: {
      en: 'Reports / Top Customers',
      ru: 'Отчёты / Топ клиентов',
      tr: 'Raporlar / Top Müşteriler',
    },
    section: {
      en: 'Operational',
      ru: 'Оперативные',
      tr: 'Operasyonel',
    },
    hubCard: {
      icon: 'bar-chart-3',
      description: {
        en: 'Top 10 customers ranked by revenue, profit, or invoice count.',
        ru: 'Топ-10 клиентов по выручке, прибыли или количеству счетов.',
        tr: 'Gelir, kâr veya fatura sayısına göre top 10 müşteri.',
      },
    },
    topbar: { periodPicker: 'month', exportButton: true },
    loader: loadTopCustomers,
  };
  defineReportView(config);
  return config;
}

function pickLabel(label: LocalizedLabel, locale: string): string {
  const l = locale as Locale;
  return label[l] ?? label.en;
}

type Mode = 'revenue' | 'profit' | 'count';

function resolveMode(chip: string | null): Mode {
  if (chip === 'profit' || chip === 'count') return chip;
  return 'revenue';
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

async function loadTopCustomers(
  ctx: Parameters<ReportViewConfig['loader']>[0],
): Promise<ReportViewPayload> {
  const { tx, period, tenant } = ctx;
  const mode = resolveMode(ctx.chip);

  // ---------- Aggregate per counterparty over the selected period ----------
  const grouped = await tx.movement_sales_sale.groupBy({
    by: ['counterparty'],
    where: {
      active: true,
      timestamp: { gte: period.start, lt: period.end },
    },
    _sum: { revenue: true, cost: true, quantity: true },
    _count: { _all: true },
    orderBy:
      mode === 'count'
        ? { _count: { counterparty: 'desc' } }
        : mode === 'profit'
          ? { _sum: { revenue: 'desc' } } // profit sort applied below; pre-sort by revenue for tie-break stability
          : { _sum: { revenue: 'desc' } },
    take: mode === 'profit' ? 200 : 10,
  });

  // For 'profit' we needed a wider window to re-sort by computed profit;
  // for the other modes prisma already gave us the right top-10.
  type Agg = {
    counterparty: string;
    revenue: number;
    cost: number;
    profit: number;
    quantity: number;
    invoiceLineCount: number;
  };

  const allAggs: Agg[] = grouped.map((g) => {
    const revenue = Number(g._sum.revenue ?? 0);
    const cost = Number(g._sum.cost ?? 0);
    return {
      counterparty: g.counterparty,
      revenue,
      cost,
      profit: revenue - cost,
      quantity: Number(g._sum.quantity ?? 0),
      invoiceLineCount: g._count._all,
    };
  });

  if (mode === 'profit') {
    allAggs.sort((a, b) => b.profit - a.profit);
  } else if (mode === 'count') {
    allAggs.sort((a, b) => b.invoiceLineCount - a.invoiceLineCount);
  } else {
    allAggs.sort((a, b) => b.revenue - a.revenue);
  }
  const top = allAggs.slice(0, 10);
  const topIds = top.map((a) => a.counterparty);

  // ---------- Hydrate customer names ----------
  const customers = topIds.length
    ? await tx.catalog_sales_customer.findMany({
        where: { id: { in: topIds } },
        select: { id: true, name: true, code: true },
      })
    : [];
  const customerById = new Map(customers.map((c) => [c.id, c]));

  // ---------- YoY: same period one year earlier, restricted to top ids ----------
  const yoyMap = new Map<string, number>();
  if (topIds.length) {
    const yoyStart = new Date(period.start);
    yoyStart.setUTCFullYear(yoyStart.getUTCFullYear() - 1);
    const yoyEnd = new Date(period.end);
    yoyEnd.setUTCFullYear(yoyEnd.getUTCFullYear() - 1);
    const yoyGrouped = await tx.movement_sales_sale.groupBy({
      by: ['counterparty'],
      where: {
        active: true,
        timestamp: { gte: yoyStart, lt: yoyEnd },
        counterparty: { in: topIds },
      },
      _sum: { revenue: true },
    });
    for (const g of yoyGrouped) {
      yoyMap.set(g.counterparty, Number(g._sum.revenue ?? 0));
    }
  }

  // ---------- KPIs ----------
  const totalRevenue = top.reduce((s, a) => s + a.revenue, 0);
  const totalProfit = top.reduce((s, a) => s + a.profit, 0);
  const totalInvoiceLines = top.reduce((s, a) => s + a.invoiceLineCount, 0);
  const avgInvoice = totalInvoiceLines > 0 ? totalRevenue / totalInvoiceLines : 0;
  const topCustomerRevenue = top[0]?.revenue ?? 0;
  const topShare = totalRevenue > 0 ? (topCustomerRevenue / totalRevenue) * 100 : 0;

  const kpis: ReportKpiCard[] = [
    {
      id: 'totalRevenue',
      label: { en: 'Total Revenue', ru: 'Выручка', tr: 'Toplam Gelir' },
      value: formatMoney(totalRevenue, tenant.locale, tenant.currency),
    },
    {
      id: 'totalProfit',
      label: { en: 'Total Profit', ru: 'Прибыль', tr: 'Toplam Kâr' },
      value: formatMoney(totalProfit, tenant.locale, tenant.currency),
      tone: totalProfit >= 0 ? 'positive' : 'negative',
    },
    {
      id: 'avgInvoice',
      label: { en: 'Avg Invoice', ru: 'Средний счёт', tr: 'Ort. Fatura' },
      value: formatMoney(avgInvoice, tenant.locale, tenant.currency),
    },
    {
      id: 'topShare',
      label: { en: 'Top Customer Share', ru: 'Доля №1', tr: '#1 Müşteri Payı' },
      value: `${topShare.toFixed(1)}%`,
    },
  ];

  // ---------- Ranked section ----------
  const topRevenueForFill = (() => {
    if (mode === 'count') return top[0]?.invoiceLineCount ?? 0;
    if (mode === 'profit') return top[0]?.profit ?? 0;
    return top[0]?.revenue ?? 0;
  })();
  const safeMax = topRevenueForFill > 0 ? topRevenueForFill : 1;

  const rankedItems: ReportRankedItem[] = top.map((a) => {
    const cust = customerById.get(a.counterparty);
    const displayName = cust?.name ?? cust?.code ?? a.counterparty.slice(0, 8);
    const measure =
      mode === 'count' ? a.invoiceLineCount : mode === 'profit' ? a.profit : a.revenue;
    const amount =
      mode === 'count'
        ? String(a.invoiceLineCount)
        : formatMoney(mode === 'profit' ? a.profit : a.revenue, tenant.locale, tenant.currency);
    return {
      id: a.counterparty,
      initials: initialsOf(displayName),
      name: displayName,
      meta: pickLabel(
        {
          en: `${a.invoiceLineCount} invoices`,
          ru: `${a.invoiceLineCount} счетов`,
          tr: `${a.invoiceLineCount} fatura`,
        },
        tenant.locale,
      ),
      amount,
      fillPct: Math.round((measure / safeMax) * 100),
    };
  });

  // ---------- Breakdown table ----------
  const breakdownRows: ReportBreakdownRow[] = top.map((a, idx) => {
    const cust = customerById.get(a.counterparty);
    const displayName = cust?.name ?? cust?.code ?? a.counterparty.slice(0, 8);
    const lineAvg = a.invoiceLineCount > 0 ? a.revenue / a.invoiceLineCount : 0;
    const priorRev = yoyMap.get(a.counterparty);
    const yoyCell: ReportBreakdownRow['cells'][number] = (() => {
      if (priorRev === undefined || priorRev <= 0.005) {
        return (
          <span key="y" className="pill pill-success">
            {pickLabel({ en: 'New', ru: 'Новый', tr: 'Yeni' }, tenant.locale)}
          </span>
        );
      }
      const yoyPct = ((a.revenue - priorRev) / priorRev) * 100;
      const tone = yoyPct >= 10 ? 'pill-success' : yoyPct >= -5 ? 'pill-neutral' : 'pill-warning';
      const sign = yoyPct >= 0 ? '+' : '';
      return (
        <span key="y" className={`pill ${tone}`}>
          {`${sign}${yoyPct.toFixed(1)}%`}
        </span>
      );
    })();
    return {
      id: a.counterparty,
      cells: [
        <span key="r" className="mono">
          {String(idx + 1).padStart(2, '0')}
        </span>,
        <span key="n">
          <div className="row-title">{displayName}</div>
          <div className="row-sub">{cust?.code ?? ''}</div>
        </span>,
        formatMoney(a.revenue, tenant.locale, tenant.currency),
        String(a.invoiceLineCount),
        formatMoney(lineAvg, tenant.locale, tenant.currency),
        formatMoney(a.profit, tenant.locale, tenant.currency),
        yoyCell,
      ],
    };
  });

  const totalAvg = totalInvoiceLines > 0 ? totalRevenue / totalInvoiceLines : 0;
  const totalsRow = [
    pickLabel(
      {
        en: `${top.length} customers`,
        ru: `${top.length} клиентов`,
        tr: `${top.length} müşteri`,
      },
      tenant.locale,
    ),
    '',
    formatMoney(totalRevenue, tenant.locale, tenant.currency),
    String(totalInvoiceLines),
    formatMoney(totalAvg, tenant.locale, tenant.currency),
    formatMoney(totalProfit, tenant.locale, tenant.currency),
    '',
  ];

  return {
    kpis,
    chips: [
      {
        key: 'revenue',
        label: { en: 'Revenue', ru: 'Выручка', tr: 'Gelir' },
      },
      {
        key: 'profit',
        label: { en: 'Profit', ru: 'Прибыль', tr: 'Kâr' },
      },
      {
        key: 'count',
        label: { en: 'Invoice count', ru: 'Кол-во счетов', tr: 'Fatura sayısı' },
      },
    ],
    sections: [
      {
        kind: 'ranked',
        title: {
          en:
            mode === 'count'
              ? 'Top 10 by invoice count'
              : mode === 'profit'
                ? 'Top 10 by gross profit'
                : 'Top 10 by revenue',
          ru:
            mode === 'count'
              ? 'Топ-10 по кол-ву счетов'
              : mode === 'profit'
                ? 'Топ-10 по прибыли'
                : 'Топ-10 по выручке',
          tr:
            mode === 'count'
              ? 'Fatura sayısına göre top 10'
              : mode === 'profit'
                ? 'Brüt kâra göre top 10'
                : 'Gelire göre top 10',
        },
        items: rankedItems,
      },
      {
        kind: 'breakdown',
        title: { en: 'Customer breakdown', ru: 'По клиентам', tr: 'Müşteri kırılımı' },
        columns: [
          { key: 'rk', label: { en: '#', ru: '№', tr: '#' } },
          {
            key: 'cust',
            label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' },
          },
          {
            key: 'rev',
            label: { en: 'Revenue', ru: 'Выручка', tr: 'Gelir' },
            align: 'right',
          },
          {
            key: 'count',
            label: { en: 'Invoices', ru: 'Счетов', tr: 'Fatura' },
            align: 'right',
          },
          {
            key: 'avg',
            label: { en: 'Avg invoice', ru: 'Средний счёт', tr: 'Ort. fatura' },
            align: 'right',
          },
          {
            key: 'profit',
            label: { en: 'Gross profit', ru: 'Прибыль', tr: 'Brüt kâr' },
            align: 'right',
          },
          {
            key: 'yoy',
            label: { en: 'YoY%', ru: 'YoY%', tr: 'YoY%' },
            align: 'right',
          },
        ],
        rows: breakdownRows,
        totalsRow,
      },
    ],
  };
}
