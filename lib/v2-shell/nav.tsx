import {
  Boxes,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Package,
  Settings,
  TrendingUp,
  UserCog,
  Zap,
} from 'lucide-react';
import type { RailKey } from './active-rail';

/**
 * A permission gate for a nav node. A string is a single permission code; an
 * array is ANY-of (the node shows if the user holds at least one). Codes are
 * the SAME ones the engine derives from entity configs (`<config.id>:read`) —
 * see `buildNavForPermissions`. Visibility derives from permissions; there is
 * no parallel role→menu table.
 */
export type Requires = string | string[];

export type RailDef = {
  key: RailKey;
  icon: LucideIcon;
  i18nKey: string;
  href: string;
  requires?: Requires;
};

export type PanelItem = {
  i18nKey: string;
  href: string;
  icon?: LucideIcon;
  count?: number;
  requires?: Requires;
  /**
   * Optional global feature-flag key. When set, this item is hidden unless the
   * key is enabled in the `feature_flag` table (managed in super-admin) — an
   * AND on top of `requires`. Items with no `feature` are always-on. See
   * `platform/features/feature-flags.ts`.
   */
  feature?: string;
  /**
   * Optional nested sub-items. When present, the item renders as an expandable
   * disclosure in the panel: the parent row toggles its children open/closed,
   * children render indented below. Each child is gated by its own `requires` /
   * `feature` (see `buildNavForPermissions`, which walks one level of nesting).
   * The parent itself shows when its own gate passes AND it (or any child) is
   * permitted. Used for the Turnover (Ciro) report group today.
   */
  children?: PanelItem[];
};

export type PanelSection = {
  i18nKey: string;
  items: PanelItem[];
  requires?: Requires;
};

export const RAILS: RailDef[] = [
  { key: 'dashboard', icon: LayoutDashboard, i18nKey: 'rail.dashboard', href: '/dashboard' },
  { key: 'catalogs', icon: Package, i18nKey: 'rail.catalogs', href: '/catalogs/products' },
  {
    key: 'documents',
    icon: FileText,
    i18nKey: 'rail.documents',
    href: '/documents/sales-invoice',
  },
  {
    key: 'registers',
    icon: Boxes,
    i18nKey: 'rail.registers',
    href: '/registers/accounts_receivable',
  },
  { key: 'reports', icon: TrendingUp, i18nKey: 'rail.reports', href: '/reports/gross-profit' },
  // Installing integrations is an admin act.
  {
    key: 'addons',
    icon: Zap,
    i18nKey: 'rail.addons',
    href: '/addons',
    requires: 'admin.organization:edit',
  },
  { key: 'admin', icon: UserCog, i18nKey: 'rail.admin', href: '/admin/members' },
  { key: 'settings', icon: Settings, i18nKey: 'rail.settings', href: '/settings' },
];

// Report items are visible to owner/admin (blanket `reports:read`) OR to a role
// holding the matching report bucket — `reports` is a sealed namespace so a
// wildcard never satisfies a bucket; both must be listed (ANY-of).
const r = (...buckets: string[]): string[] => ['reports:read', ...buckets];

export const PANELS: Record<RailKey, PanelSection[]> = {
  dashboard: [
    {
      i18nKey: 'dashboard.section.overview',
      items: [{ i18nKey: 'dashboard.summary', href: '/dashboard', icon: LayoutDashboard }],
    },
  ],
  catalogs: [
    {
      i18nKey: 'catalogs.section.main',
      items: [
        {
          i18nKey: 'catalogs.products',
          href: '/catalogs/products',
          requires: 'inventory.product:read',
        },
        {
          i18nKey: 'catalogs.partners',
          href: '/catalogs/partners',
          requires: ['sales.customer:read', 'purchases.supplier:read'],
        },
        {
          i18nKey: 'catalogs.warehouses',
          href: '/catalogs/warehouses',
          requires: 'inventory.warehouse:read',
        },
        {
          i18nKey: 'catalogs.cashRegisters',
          href: '/catalogs/cash-registers',
          requires: 'treasury.cash_register:read',
        },
        {
          i18nKey: 'catalogs.bankAccounts',
          href: '/catalogs/bank-accounts',
          requires: 'treasury.bank_account:read',
        },
        {
          i18nKey: 'catalogs.fixedAssets',
          href: '/catalogs/fixed-assets',
          requires: 'assets.fixed_asset:read',
          feature: 'assets.fixed_asset',
        },
        {
          i18nKey: 'catalogs.priceTypes',
          href: '/catalogs/price-types',
          requires: 'sales.price_type:read',
        },
      ],
    },
  ],
  documents: [
    {
      i18nKey: 'documents.section.sales',
      items: [
        {
          i18nKey: 'documents.salesInvoice',
          href: '/documents/sales-invoice',
          requires: 'sales.invoice:read',
        },
        {
          i18nKey: 'documents.paymentReceived',
          href: '/documents/payment-received',
          requires: 'sales.payment_received:read',
        },
        {
          i18nKey: 'documents.bankReceipt',
          href: '/documents/bank-receipt',
          requires: 'sales.bank_receipt:read',
        },
        {
          i18nKey: 'documents.returnInvoice',
          href: '/documents/return-invoice',
          requires: 'sales.return_invoice:read',
        },
        {
          i18nKey: 'documents.refundPayment',
          href: '/documents/refund-payment',
          requires: 'sales.refund_payment:read',
        },
      ],
    },
    {
      i18nKey: 'documents.section.purchases',
      items: [
        {
          i18nKey: 'documents.purchaseInvoice',
          href: '/purchases/purchase-invoice',
          requires: 'purchases.invoice:read',
        },
        {
          i18nKey: 'documents.paymentSent',
          href: '/purchases/payment-sent',
          requires: 'purchases.payment_sent:read',
        },
        {
          i18nKey: 'documents.bankPayment',
          href: '/documents/bank-payment',
          requires: 'purchases.bank_payment:read',
        },
        {
          i18nKey: 'documents.returnPurchase',
          href: '/purchases/return-purchase',
          requires: 'purchases.return_purchase:read',
        },
        {
          i18nKey: 'documents.refundReceived',
          href: '/documents/refund-received',
          requires: 'purchases.refund_received:read',
        },
      ],
    },
    {
      i18nKey: 'documents.section.inventory',
      items: [
        {
          i18nKey: 'documents.inventoryCount',
          href: '/documents/inventory-count',
          requires: 'inventory.inventory_count:read',
        },
        {
          i18nKey: 'documents.stockAdjustment',
          href: '/documents/stock-adjustment',
          requires: 'inventory.stock_adjustment:read',
        },
        {
          i18nKey: 'documents.stockTransfer',
          href: '/documents/stock-transfer',
          requires: 'inventory.stock_transfer:read',
        },
        {
          i18nKey: 'documents.priceSetting',
          href: '/documents/price-setting',
          requires: 'inventory.price_setting:read',
        },
      ],
    },
    {
      i18nKey: 'documents.section.treasury',
      items: [
        {
          i18nKey: 'documents.cashTransfer',
          href: '/documents/cash-transfer',
          requires: 'treasury.cash_transfer:read',
        },
        {
          i18nKey: 'documents.bankDeposit',
          href: '/documents/bank-deposit',
          requires: 'treasury.bank_deposit:read',
        },
        {
          i18nKey: 'documents.bankWithdrawal',
          href: '/documents/bank-withdrawal',
          requires: 'treasury.bank_withdrawal:read',
        },
      ],
    },
  ],
  registers: [
    {
      i18nKey: 'registers.section.main',
      // Registers have no entity perm of their own; gate on the source-document
      // read so warehouse/limited roles don't see financial ledgers.
      items: [
        {
          i18nKey: 'registers.receivable',
          href: '/registers/accounts_receivable',
          requires: 'sales.invoice:read',
        },
        {
          i18nKey: 'registers.payable',
          href: '/registers/accounts_payable',
          requires: 'purchases.invoice:read',
        },
        { i18nKey: 'registers.sales', href: '/registers/sales', requires: 'sales.invoice:read' },
        {
          i18nKey: 'registers.productPrices',
          href: '/registers/product-prices',
          requires: 'prices:read',
        },
        {
          i18nKey: 'registers.stockBalance',
          href: '/registers/stock-balance',
          requires: 'inventory.warehouse_stock:read',
        },
      ],
    },
  ],
  reports: [
    {
      i18nKey: 'reports.section.main',
      items: [
        {
          i18nKey: 'reports.grossProfit',
          href: '/reports/gross-profit',
          requires: r('reports.financial:read'),
        },
        {
          i18nKey: 'reports.turnover',
          href: '/reports/turnover',
          requires: r('reports.financial:read', 'reports.sales:read', 'reports.inventory:read'),
          children: [
            {
              i18nKey: 'reports.turnoverReceivable',
              href: '/reports/turnover/receivable',
              requires: r('reports.financial:read'),
            },
            {
              i18nKey: 'reports.turnoverPayable',
              href: '/reports/turnover/payable',
              requires: r('reports.financial:read'),
            },
            {
              i18nKey: 'reports.turnoverSales',
              href: '/reports/turnover/sales',
              requires: r('reports.sales:read'),
            },
            {
              i18nKey: 'reports.turnoverStock',
              href: '/reports/turnover/stock',
              requires: r('reports.inventory:read'),
            },
          ],
        },
        {
          i18nKey: 'reports.counterpartyCard',
          href: '/reports/counterparty-card',
          requires: r('reports.sales:read', 'reports.purchases:read'),
        },
        {
          i18nKey: 'reports.productCard',
          href: '/reports/product-card',
          requires: r('reports.inventory:read'),
        },
        {
          i18nKey: 'reports.inventoryValuation',
          href: '/reports/inventory-valuation',
          requires: r('reports.inventory:read'),
        },
        { i18nKey: 'reports.aging', href: '/reports/aging', requires: r('reports.financial:read') },
        {
          i18nKey: 'reports.cashBook',
          href: '/reports/cash-book',
          requires: r('reports.financial:read', 'reports.payments:read'),
        },
        {
          i18nKey: 'reports.cashFlow',
          href: '/reports/cash-flow',
          requires: r('reports.financial:read', 'reports.payments:read'),
        },
        {
          i18nKey: 'reports.incomeStatement',
          href: '/reports/income-statement',
          requires: r('reports.financial:read'),
        },
        {
          i18nKey: 'reports.topCustomers',
          href: '/reports/top-customers',
          requires: r('reports.sales:read'),
        },
        {
          i18nKey: 'reports.slowStock',
          href: '/reports/slow-stock',
          requires: r('reports.inventory:read'),
        },
      ],
    },
  ],
  addons: [
    {
      i18nKey: 'addons.section.main',
      items: [{ i18nKey: 'addons.all', href: '/addons', requires: 'admin.organization:edit' }],
    },
  ],
  admin: [
    {
      i18nKey: 'admin.section.main',
      items: [
        { i18nKey: 'admin.members', href: '/admin/members', requires: 'admin.members:manage' },
        { i18nKey: 'admin.roles', href: '/admin/roles', requires: 'admin.members:manage' },
        { i18nKey: 'admin.audit', href: '/admin/audit', requires: 'admin.audit:read' },
      ],
    },
  ],
  settings: [
    {
      i18nKey: 'settings.section.main',
      items: [
        {
          i18nKey: 'settings.general',
          href: '/settings/general',
          requires: 'admin.organization:edit',
        },
        {
          i18nKey: 'settings.organization',
          href: '/settings/organization',
          requires: 'admin.organization:edit',
        },
        { i18nKey: 'settings.tax', href: '/settings/tax', requires: 'admin.organization:edit' },
        {
          i18nKey: 'settings.notifications',
          href: '/settings/notifications',
          requires: 'admin.organization:edit',
        },
        {
          i18nKey: 'settings.security',
          href: '/settings/security',
          requires: 'admin.organization:edit',
        },
        // Billing is owner-only (admin.billing is sealed — admin's *:* can't pierce).
        {
          i18nKey: 'settings.billing',
          href: '/settings/billing',
          requires: 'admin.billing:manage',
        },
        {
          i18nKey: 'settings.api',
          href: '/settings/api/tokens',
          requires: 'admin.organization:edit',
        },
      ],
    },
    {
      i18nKey: 'settings.section.help',
      items: [{ i18nKey: 'settings.support', href: '/support', icon: LifeBuoy }],
    },
  ],
};
