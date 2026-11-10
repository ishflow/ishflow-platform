/** Pure-data widget registry — no React imports, safe for server-only use. */
export type WidgetSlot = 'hero' | 'actions' | 'quick' | 'trends' | 'activity';
export type WidgetScope = 'all' | 'own';
export type MobileWidgetType = 'kpi' | 'list' | 'chart' | 'quickAction';

export type PermissionPattern = string;

export type WidgetDataEntry = {
  id: string;
  slot: WidgetSlot;
  /** At least one pattern must match for the widget to be visible. */
  requires: PermissionPattern[];
  /** When 'own', only show to users who have the scoped variant of the permission (sales reps). Defaults to 'all'. */
  scope?: WidgetScope;
  /** Mobile contract descriptor (used by Stream 3). */
  mobile?: {
    type: MobileWidgetType;
    dataKey: string;
  };
};

export const WIDGET_REGISTRY: WidgetDataEntry[] = [
  // hero — KPI cards
  {
    id: 'kpi.cashPosition',
    slot: 'hero',
    requires: ['sales.invoice:read', 'purchases.invoice:read'],
    mobile: { type: 'kpi', dataKey: 'cashPosition' },
  },
  {
    id: 'kpi.receivables',
    slot: 'hero',
    requires: ['sales.invoice:read'],
    mobile: { type: 'kpi', dataKey: 'receivables' },
  },
  {
    id: 'kpi.payables',
    slot: 'hero',
    requires: ['purchases.invoice:read'],
    mobile: { type: 'kpi', dataKey: 'payables' },
  },
  {
    id: 'kpi.thisMonthSales',
    slot: 'hero',
    requires: ['sales.invoice:read'],
    mobile: { type: 'kpi', dataKey: 'thisMonthSales' },
  },
  {
    id: 'kpi.openInvoices',
    slot: 'hero',
    requires: ['sales.invoice:read'],
    mobile: { type: 'kpi', dataKey: 'openInvoices' },
  },
  {
    // Hero KPI for the warehouse role: shows the count of products at or
    // below threshold so the role lands on a non-empty dashboard. Value
    // computation (price-weighted total stock value) is Phase 2.
    id: 'kpi.stockValue',
    slot: 'hero',
    requires: ['inventory.warehouse_stock:read'],
    mobile: { type: 'kpi', dataKey: 'stockValue' },
  },
  {
    // Today's stock movement count (warehouse). Lets the depocu see "how
    // many goods went in/out today" without leaving the dashboard.
    id: 'kpi.todayMovements',
    slot: 'hero',
    requires: ['inventory.warehouse_stock:read'],
    mobile: { type: 'kpi', dataKey: 'todayMovements' },
  },
  {
    // Last-7-day stock movement count (warehouse). Gives the depocu a
    // rolling weekly throughput indicator on the dashboard hero.
    id: 'kpi.weekMovements',
    slot: 'hero',
    requires: ['inventory.warehouse_stock:read'],
    mobile: { type: 'kpi', dataKey: 'weekMovements' },
  },

  // actions — upcoming / alerts
  {
    id: 'action.upcomingReceivables',
    slot: 'actions',
    requires: ['sales.invoice:read'],
    scope: 'all',
    mobile: { type: 'list', dataKey: 'upcomingReceivables' },
  },
  {
    id: 'action.upcomingPayables',
    slot: 'actions',
    requires: ['purchases.invoice:read'],
    scope: 'all',
    mobile: { type: 'list', dataKey: 'upcomingPayables' },
  },
  {
    id: 'action.lowStock',
    slot: 'actions',
    requires: ['inventory.warehouse_stock:read'],
    mobile: { type: 'kpi', dataKey: 'lowStock' },
  },

  // trends — chart cards
  {
    // Sales activity trend for finance-facing roles (owner / admin /
    // bookkeeper / sales / cashier). Aggregates the recent-activity feed
    // per day so the chart doesn't need a brand-new aggregate query.
    id: 'chart.salesTrend',
    slot: 'trends',
    requires: ['sales.invoice:read'],
    mobile: { type: 'chart', dataKey: 'salesTrend' },
  },
  {
    // Stock movement trend chart for warehouse role. Backend payload is
    // currently an empty point set (real time-series query is Phase 2);
    // iOS hides the trend card entirely when payload is empty so the
    // warehouse dashboard doesn't show a misleading placeholder.
    id: 'chart.stockTrend',
    slot: 'trends',
    requires: ['inventory.warehouse_stock:read'],
    mobile: { type: 'chart', dataKey: 'stockTrend' },
  },

  // activity — lists
  {
    id: 'list.recentActivity',
    slot: 'activity',
    requires: ['sales.invoice:read'],
    mobile: { type: 'list', dataKey: 'recentActivity' },
  },
  {
    id: 'list.auditTail',
    slot: 'activity',
    requires: ['admin.audit:read'],
    mobile: { type: 'list', dataKey: 'auditTail' },
  },
];
