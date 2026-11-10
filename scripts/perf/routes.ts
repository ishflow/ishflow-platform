// scripts/perf/routes.ts
//
// Canonical top-10 perf-audit routes for 2026-05-13. Each entry is what a
// logged-in OWNER user of the demo tenant should hit, picked because they are
// the most-trafficked pages (dashboard, sales loop) plus the most-likely-slow
// pages (admin audit, period close, reports, super-admin tenants).

export type AuditRoute = {
  id: string;
  path: string;
  /** Locale prefix is added automatically; pages start with `/`. */
  desc: string;
  /** When true, the runner skips the route in CI environments without seed. */
  needsSeed?: boolean;
};

export const AUDIT_ROUTES: AuditRoute[] = [
  { id: 'dashboard', path: '/dashboard', desc: 'Owner dashboard with 18 widgets' },
  {
    id: 'sales-invoices-list',
    path: '/documents/sales.invoice',
    desc: 'Sales invoice list (paginated)',
  },
  {
    id: 'sales-invoice-detail',
    path: '/documents/sales.invoice/__FIRST__',
    desc: 'First sales invoice detail (header + lines)',
  },
  { id: 'customers-list', path: '/catalogs/sales.customer', desc: 'Customer catalog' },
  {
    id: 'products-list',
    path: '/catalogs/inventory.product',
    desc: 'Product catalog (incl. categories taxonomy)',
  },
  { id: 'gross-profit', path: '/reports/gross-profit', desc: '5-dim gross profit pivot' },
  { id: 'admin-audit', path: '/admin/audit', desc: 'Tenant audit log (paginated)' },
  {
    id: 'turnover-ar',
    path: '/reports/turnover/sales.accounts_receivable',
    desc: 'AR register turnover report',
  },
  { id: 'period-close', path: '/admin/period-close', desc: 'Period close admin' },
  {
    id: 'super-admin-tenants',
    path: '/super-admin/tenants',
    desc: 'Super-admin tenant list (no locale)',
  },
];

export const SKIP_LOCALE_PREFIX = new Set<string>(['super-admin-tenants']);
