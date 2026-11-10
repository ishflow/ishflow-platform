import type { ReactNode } from 'react';
import { KpiStripRenderer } from './kpi-strip';
import { RecentInvoicesRenderer } from './recent-invoices';
import { RevenueChartRenderer } from './revenue-chart';
import { TopCustomersRenderer } from './top-customers';

/**
 * Maps `DashboardWidgetConfig.renderer` ids to RSC components. Each
 * renderer accepts a `payload` (the loader's serialised output) plus
 * `locale` + `currency` from the tenant context. Renderers resolve
 * i18n + currency formatting on the server before handing data to the
 * existing client components.
 */
export const DASHBOARD_RENDERERS: Record<
  string,
  (props: { payload: unknown; locale: string; currency: string }) => Promise<ReactNode> | ReactNode
> = {
  'kpi-strip': (props) => KpiStripRenderer(props as never),
  'revenue-chart': (props) => RevenueChartRenderer(props as never),
  'top-customers': (props) => TopCustomersRenderer(props as never),
  'recent-invoices': (props) => RecentInvoicesRenderer(props as never),
};
