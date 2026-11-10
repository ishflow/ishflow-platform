import { defineDashboardOrder } from '@/platform/metadata';

// Variant-9 dashboard layout: KPI strip → revenue/top-customers row → recent invoices.
defineDashboardOrder(['kpi-strip', ['revenue-chart', 'top-customers'], 'recent-invoices']);
