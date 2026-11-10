import type { AppContext } from '@/platform/auth/current-context';
import {
  accountsPayableTotal,
  accountsReceivableTotal,
  lowStockCount,
  openInvoiceCount,
  recentActivity,
  thisMonthSalesTotal,
  todayStockMovementCount,
  upcomingPayables,
  upcomingReceivables,
  weekStockMovementCount,
} from '@/platform/engine/dashboard-queries';
import { selectWidgets } from '@/lib/dashboard/widget-loader';
import { WIDGET_REGISTRY } from '@/lib/dashboard/widget-registry.data';
import type { WidgetDataEntry } from '@/lib/dashboard/widget-registry.data';

export type DashboardLayoutItem = {
  slot: string;
  widgets: Array<{
    id: string;
    type: string;
    data: Record<string, unknown>;
  }>;
};

const stringify = (n: number | string): string => (typeof n === 'string' ? n : String(n));

async function kpiData(_ctx: AppContext, fetcher: () => Promise<{ current: number; delta: number }>) {
  const snap = await fetcher();
  return { value: stringify(snap.current), delta: snap.delta };
}

export const WIDGET_DATA_FETCHERS: Record<
  string,
  (ctx: AppContext) => Promise<Record<string, unknown>>
> = {
  'kpi.receivables': async (ctx) =>
    kpiData(ctx, () => accountsReceivableTotal(ctx as Parameters<typeof accountsReceivableTotal>[0])),
  'kpi.payables': async (ctx) =>
    kpiData(ctx, () => accountsPayableTotal(ctx as Parameters<typeof accountsPayableTotal>[0])),
  'kpi.thisMonthSales': async (ctx) =>
    kpiData(ctx, () => thisMonthSalesTotal(ctx as Parameters<typeof thisMonthSalesTotal>[0])),
  'kpi.openInvoices': async (ctx) =>
    kpiData(ctx, () => openInvoiceCount(ctx as Parameters<typeof openInvoiceCount>[0])),
  'kpi.cashPosition': async () => ({ value: '0', delta: 0 }),
  // Mirrors kpi-stock-value.tsx (web): MVP shows count of low-stock items;
  // value-based aggregate is Phase 2. Surfaced as a KPI count so iOS can
  // render it the same way as openInvoices.
  'kpi.stockValue': async (ctx) => {
    const low = await lowStockCount(ctx as Parameters<typeof lowStockCount>[0]);
    return { value: stringify(low.count), count: low.count, delta: 0 };
  },
  'kpi.todayMovements': async (ctx) => {
    const snap = await todayStockMovementCount(
      ctx as Parameters<typeof todayStockMovementCount>[0],
    );
    return { value: stringify(snap.count), count: snap.count, delta: 0 };
  },
  'kpi.weekMovements': async (ctx) => {
    const snap = await weekStockMovementCount(
      ctx as Parameters<typeof weekStockMovementCount>[0],
    );
    return { value: stringify(snap.count), count: snap.count, delta: 0 };
  },

  'action.upcomingReceivables': async (ctx) => {
    const items = await upcomingReceivables(ctx as Parameters<typeof upcomingReceivables>[0], 5);
    return {
      items: items.map((d) => ({
        id: d.id,
        name: d.name,
        amount: stringify(d.amount),
        date: d.date,
      })),
    };
  },
  'action.upcomingPayables': async (ctx) => {
    const items = await upcomingPayables(ctx as Parameters<typeof upcomingPayables>[0], 5);
    return {
      items: items.map((d) => ({
        id: d.id,
        name: d.name,
        amount: stringify(d.amount),
        date: d.date,
      })),
    };
  },
  'action.lowStock': async (ctx) => {
    const low = await lowStockCount(ctx as Parameters<typeof lowStockCount>[0]);
    return { count: low.count, threshold: low.threshold };
  },
  'action.unposted': async () => ({ count: 0 }),

  'list.recentActivity': async (ctx) => {
    const items = await recentActivity(ctx as Parameters<typeof recentActivity>[0], 7);
    return {
      items: items.map((a) => ({
        id: a.id,
        kind: a.kind,
        label: a.label,
        href: a.href,
        timestamp: a.timestamp,
      })),
    };
  },
  'list.auditTail': async () => ({ items: [] }),

  // Chart payload skeleton — real movement-vs-day series is Phase 2. iOS
  // hides the trend card when this returns an empty list.
  'chart.stockTrend': async () => ({ points: [] }),

  // Group the last 30 days of activity by date so the financial roles get
  // a real (if simple) trend line: number of recorded sales/payment events
  // per day. Real revenue-by-day is Phase 2 — would require a SQL
  // groupBy(date_trunc) since Prisma can't group on truncated timestamps
  // natively.
  'chart.salesTrend': async (ctx) => {
    const items = await recentActivity(ctx as Parameters<typeof recentActivity>[0], 100);
    const byDay = new Map<string, number>();
    for (const a of items) {
      const day = a.timestamp.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const points = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
    return { points };
  },
};

export async function buildDashboardLayout(ctx: AppContext): Promise<DashboardLayoutItem[]> {
  const selected = selectWidgets(ctx, WIDGET_REGISTRY);
  const layout: DashboardLayoutItem[] = [];

  const slots = ['hero', 'actions', 'activity'] as const;

  for (const slot of slots) {
    const widgets = selected[slot];
    if (widgets.length === 0) continue;

    const slotWidgets = await Promise.all(
      widgets.map(async (w: WidgetDataEntry) => {
        const fetcher = WIDGET_DATA_FETCHERS[w.id];
        const data = fetcher ? await fetcher(ctx) : {};
        return {
          id: w.id,
          type: w.mobile?.type ?? 'kpi',
          data,
        };
      }),
    );

    layout.push({ slot, widgets: slotWidgets });
  }

  return layout;
}
