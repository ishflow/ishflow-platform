'use client';

import type { ComponentType } from 'react';
import { WIDGET_REGISTRY } from './widget-registry.data';

// Lazy-loaded widget components to avoid bundling all widgets on every page.
const WIDGET_LAZY_IMPORTS: Record<string, () => Promise<{ default: ComponentType<unknown> }>> = {
  'kpi.receivables': () => import('./widgets/kpi-receivables'),
  'kpi.payables': () => import('./widgets/kpi-payables'),
  'kpi.thisMonthSales': () => import('./widgets/kpi-this-month-sales'),
  'kpi.openInvoices': () => import('./widgets/kpi-open-invoices'),
  'kpi.cashPosition': () => import('./widgets/kpi-cash-position'),
  'action.upcomingReceivables': () => import('./widgets/action-upcoming-receivables'),
  'action.upcomingPayables': () => import('./widgets/action-upcoming-payables'),
  'action.lowStock': () => import('./widgets/action-low-stock'),
  'list.recentActivity': () => import('./widgets/list-recent-activity'),
  'list.auditTail': () => import('./widgets/list-audit-tail'),
};

export { WIDGET_REGISTRY };
export { WIDGET_LAZY_IMPORTS };
