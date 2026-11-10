import { last30DaysTrend, thisMonthSalesTotal } from '@/platform/engine/dashboard-queries';
import { defineDashboardWidget } from '@/platform/metadata';

export type RevenueChartPayload = {
  currency: string;
  points: number[];
  labels: string[];
  totalRevenue: number;
  changePct: number;
};

defineDashboardWidget<RevenueChartPayload>({
  id: 'revenue-chart',
  title: { en: 'Revenue Chart', ru: 'График выручки', tr: 'Gelir Grafiği' },
  layout: 'half-row',
  renderer: 'revenue-chart',
  permissions: { read: 'tenant' },
  requires: 'sales.invoice:read',
  async loader(ctx) {
    const queries = { tenant: { id: ctx.tenant.id } } as Parameters<typeof last30DaysTrend>[0];
    const [trend, ms] = await Promise.all([last30DaysTrend(queries), thisMonthSalesTotal(queries)]);
    const points = trend.map((p) => p.sales);
    // One label per point (1:1 with `points`); the chart thins the x-axis ticks.
    const labels = trend.map((p) =>
      new Date(p.date).toLocaleDateString(ctx.tenant.locale, {
        day: 'numeric',
        month: 'short',
      }),
    );
    const totalRevenue = trend.reduce((sum, p) => sum + p.sales, 0);
    return {
      currency: ctx.tenant.currency,
      points,
      labels,
      totalRevenue,
      changePct: ms.delta,
    };
  },
});
