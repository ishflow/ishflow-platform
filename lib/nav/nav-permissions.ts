import type { NavEntry } from '@/lib/generated/nav';
import { hasPermission } from '@/platform/engine/permissions';

export const NAV_PERMISSIONS: Record<string, string[]> = {
  'sales.customer': ['sales.customer:read'],
  'sales.invoice': ['sales.invoice:read'],
  'sales.payment_received': ['sales.payment_received:read'],
  'sales.price_agreement': ['sales.price_agreement:read'],
  'sales.price_type': ['sales.price_type:read'],
  'purchases.supplier': ['purchases.supplier:read'],
  'purchases.invoice': ['purchases.invoice:read'],
  'purchases.payment_sent': ['purchases.payment_sent:read'],
  'inventory.product': ['inventory.product:read'],
  'inventory.warehouse': ['inventory.warehouse:read'],
  'inventory.price_setting': ['inventory.price_setting:read'],
  'inventory.product_price': ['inventory.product_price:read'],
  'inventory.stock_balance': ['inventory.stock_balance:read', 'inventory.warehouse_stock:read'],
  'purchases.accounts_payable': ['purchases.accounts_payable:read'],
  'sales.accounts_receivable': ['sales.accounts_receivable:read'],
  'sales.sale': ['sales.sale:read'],
};

export function filterNav(entries: readonly NavEntry[], permissions: Set<string>): NavEntry[] {
  return entries.filter((entry) => {
    const required = NAV_PERMISSIONS[entry.id];
    // No entry in NAV_PERMISSIONS → default visible (forward-compat)
    if (!required) return true;
    // At least one required permission must match
    return required.some((pat) => hasPermission(permissions, pat));
  });
}
