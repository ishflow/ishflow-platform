import type { AppContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import { pickPrimaryRoleName } from '@/platform/auth/pick-primary-role';

export type MobileTab = {
  id: string;
  icon: string;
  labelKey: string;
  requires: string[];
  orderByRole?: Record<string, number>;
  /** Which tenant.mobileFeatures flag gates this tab. Absent = no gating. */
  featureFlag?: 'sales' | 'inventory' | 'purchases' | 'payments';
};

export type MobileFabAction = {
  id: string;
  icon: string;
  labelKey: string;
  requires: string[];
  order: number;
};

export const MOBILE_TABS: MobileTab[] = [
  {
    id: 'home',
    icon: 'house.fill',
    labelKey: 'shell.tab.home',
    requires: [],
    orderByRole: {
      owner: 1,
      admin: 1,
      chief_accountant: 1,
      bookkeeper: 1,
      cashier: 1,
      buyer: 1,
      sales: 1,
      warehouse: 1,
      viewer: 1,
    },
  },
  {
    id: 'docs',
    icon: 'doc.text.fill',
    labelKey: 'shell.tab.docs',
    requires: [
      'sales.invoice:read',
      'purchases.invoice:read',
      'sales.payment_received:read',
      'purchases.payment_sent:read',
    ],
    featureFlag: 'sales',
    orderByRole: {
      owner: 2,
      admin: 2,
      chief_accountant: 2,
      bookkeeper: 2,
      cashier: 2,
      buyer: 2,
      sales: 2,
      viewer: 2,
    },
  },
  {
    id: 'stock',
    icon: 'cube.box.fill',
    labelKey: 'shell.tab.stock',
    requires: ['inventory.warehouse_stock:read'],
    featureFlag: 'inventory',
    orderByRole: {
      owner: 3,
      admin: 3,
      chief_accountant: 3,
      bookkeeper: 3,
      cashier: 3,
      buyer: 3,
      sales: 3,
      warehouse: 2,
      viewer: 3,
    },
  },
  {
    id: 'cari',
    icon: 'person.2.fill',
    labelKey: 'shell.tab.cari',
    requires: ['sales.customer:read', 'purchases.supplier:read'],
    featureFlag: 'sales',
    orderByRole: {
      owner: 4,
      admin: 4,
      chief_accountant: 4,
      bookkeeper: 4,
      cashier: 4,
      buyer: 4,
      sales: 4,
      viewer: 4,
    },
  },
];

export const MOBILE_FAB_ACTIONS: MobileFabAction[] = [
  { id: 'salesInvoice', icon: 'doc.badge.plus', labelKey: 'dashboard.fab.salesInvoice', requires: ['sales.invoice:write'], order: 1 },
  { id: 'paymentReceived', icon: 'arrow.down.circle.fill', labelKey: 'dashboard.fab.paymentReceived', requires: ['sales.payment_received:write'], order: 2 },
  { id: 'purchaseInvoice', icon: 'doc.text.magnifyingglass', labelKey: 'dashboard.fab.purchaseInvoice', requires: ['purchases.invoice:write'], order: 3 },
  { id: 'paymentSent', icon: 'arrow.up.circle.fill', labelKey: 'dashboard.fab.paymentSent', requires: ['purchases.payment_sent:write'], order: 4 },
  { id: 'stockIn', icon: 'arrow.down.to.line.alt', labelKey: 'dashboard.fab.stockIn', requires: ['inventory.warehouse_stock:write'], order: 5 },
  { id: 'stockOut', icon: 'arrow.up.to.line.alt', labelKey: 'dashboard.fab.stockOut', requires: ['inventory.warehouse_stock:write'], order: 6 },
  { id: 'customer', icon: 'person.badge.plus', labelKey: 'dashboard.fab.customer', requires: ['sales.customer:write'], order: 7 },
];

function isFeatureEnabled(ctx: AppContext, flag?: MobileTab['featureFlag']): boolean {
  if (!flag) return true;
  const features = ctx.tenant
    ? ((ctx.tenant as unknown as { mobileFeatures?: Record<string, boolean> }).mobileFeatures ?? {})
    : {};
  return features[flag] ?? true;
}

/**
 * Return the ordered list of tabs visible to the current user.
 *
 * Gating:
 *   1. tenant.mobileFeatures flag (if applicable)
 *   2. At least one required permission must match
 */
type MembershipWithRoles = NonNullable<AppContext['membership']> & { roles: Array<{ name: string }> };

export function selectTabs(ctx: AppContext): Array<{ id: string; icon: string; labelKey: string; order: number }> {
  const membership = ctx.membership as MembershipWithRoles | null;
  const role = pickPrimaryRoleName(membership?.roles ?? []);

  const visible = MOBILE_TABS.filter((tab) => {
    if (!isFeatureEnabled(ctx, tab.featureFlag)) return false;
    if (tab.requires.length === 0) return true;
    return tab.requires.some((pat) => hasPermission(ctx.permissions, pat));
  });

  return visible.map((tab) => ({
    id: tab.id,
    icon: tab.icon,
    labelKey: tab.labelKey,
    order: tab.orderByRole?.[role] ?? 99,
  }));
}

/**
 * Return the ordered list of FAB actions visible to the current user.
 *
 * Requires at least one `:write` permission globally (the FAB sentinel check)
 * AND the specific action permission.
 */
export function selectFabActions(ctx: AppContext): Array<{ id: string; icon: string; labelKey: string; order: number }> {
  // Sentinel: user must have at least one write permission to see FAB at all.
  // Check if the user can perform ANY of the defined FAB actions.
  const hasAnyWrite = MOBILE_FAB_ACTIONS.some((action) =>
    action.requires.some((pat) => hasPermission(ctx.permissions, pat)),
  );
  if (!hasAnyWrite) return [];

  return MOBILE_FAB_ACTIONS.filter((action) =>
    action.requires.some((pat) => hasPermission(ctx.permissions, pat)),
  ).map((action) => ({
    id: action.id,
    icon: action.icon,
    labelKey: action.labelKey,
    order: action.order,
  }));
}
