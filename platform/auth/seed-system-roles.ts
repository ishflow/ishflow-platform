import { Prisma } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';

export type SystemRoleName =
  | 'owner'
  | 'admin'
  | 'viewer'
  | 'bookkeeper'
  | 'sales'
  | 'warehouse'
  | 'chief_accountant'
  | 'cashier'
  | 'buyer';

export const OWNER_EXCLUSIVE_PERMISSIONS = [
  'owner:tenant_archive',
  'owner:tenant_delete',
  'owner:tenant_transfer',
  'owner:branding',
  'owner:legal_name_edit',
  'owner:remove_admin',
  'owner:assign_owner_role',
  'owner:export_full',
] as const;

export const SYSTEM_ROLE_DEFS: Record<
  SystemRoleName,
  { description: string; permissions: string[] }
> = {
  owner: {
    description: 'Full access. Auto-assigned to the Clerk organization owner.',
    permissions: [
      '*:*',
      ...OWNER_EXCLUSIVE_PERMISSIONS,
      'reports:read',
      'admin.billing:manage',
      'admin.organization:edit',
      'admin.organization:delete',
      'admin.audit:read',
    ],
  },
  admin: {
    description: 'Full access. Clerk organization admins receive this role.',
    // Admin's runtime access is granted via `*:*` wildcard piercing. The
    // explicit catalog/register writes below are NOT extra power for admin
    // — they exist so the concrete permission catalog used by API key
    // scopes (`platform/api-keys/permissions.ts`) sees these entries.
    // Without them, `inventory.product:write` etc. are unreachable via
    // any API key because the scope mapper intentionally drops wildcards.
    permissions: [
      '*:*',
      'reports:read',
      'admin.organization:edit',
      'admin.audit:read',
      'inventory.product:write',
      'inventory.product_category:write',
      'inventory.product_group:write',
      'platform.currency:write',
      'sales.price_type:write',
      'sales.price_agreement:write',
      'sales.invoice:send_email',
    ],
  },
  viewer: {
    description: 'Read-only access to everything.',
    // `*:read` covers catalogs/documents/registers, but `reports` is a sealed
    // namespace a wildcard can't pierce — so a read-everything role needs the
    // report buckets explicitly to see (read-only) every report area.
    permissions: [
      '*:read',
      'reports.financial:read',
      'reports.sales:read',
      'reports.purchases:read',
      'reports.inventory:read',
      'reports.payments:read',
    ],
  },
  bookkeeper: {
    description: 'Handles invoices, payments, and bookkeeping. No inventory or pricing.',
    permissions: [
      '*:read',
      'sales.invoice:write',
      'sales.invoice:post',
      'sales.invoice:unpost',
      'sales.invoice:send_email',
      'sales.payment_received:write',
      'sales.payment_received:post',
      'sales.payment_received:unpost',
      'purchases.invoice:write',
      'purchases.invoice:post',
      'purchases.invoice:unpost',
      'purchases.payment_sent:write',
      'purchases.payment_sent:post',
      'purchases.payment_sent:unpost',
      'sales.customer:write',
      'purchases.supplier:write',
      'reports.financial:read',
      'reports.sales:read',
      'reports.purchases:read',
    ],
  },
  chief_accountant: {
    description:
      'Top financial authority. All bookkeeping + period close + FX + currency. No audit log (owner/admin only).',
    permissions: [
      '*:read',
      'sales.invoice:write',
      'sales.invoice:post',
      'sales.invoice:unpost',
      'sales.invoice:send_email',
      'sales.payment_received:write',
      'sales.payment_received:post',
      'sales.payment_received:unpost',
      'purchases.invoice:write',
      'purchases.invoice:post',
      'purchases.invoice:unpost',
      'purchases.payment_sent:write',
      'purchases.payment_sent:post',
      'purchases.payment_sent:unpost',
      'sales.customer:write',
      'purchases.supplier:write',
      'inventory.product:read',
      'inventory.warehouse:read',
      'inventory.warehouse_stock:read',
      'admin.fx:manage',
      'admin.period:manage',
      'admin.currency:manage',
      'reports.financial:read',
      'reports.sales:read',
      'reports.purchases:read',
    ],
  },
  cashier: {
    description: 'Handles payment_received and payment_sent only. Reads invoices.',
    permissions: [
      'sales.invoice:read',
      'purchases.invoice:read',
      'sales.payment_received:read',
      'sales.payment_received:write',
      'sales.payment_received:post',
      'sales.payment_received:unpost',
      'purchases.payment_sent:read',
      'purchases.payment_sent:write',
      'purchases.payment_sent:post',
      'purchases.payment_sent:unpost',
      'sales.customer:read',
      'purchases.supplier:read',
      'platform.currency:read',
      'inventory.warehouse:read',
      'reports.payments:read',
      'reports.payments:export',
      'attachments:read',
      'attachments:write',
    ],
  },
  buyer: {
    description: 'Owns assigned suppliers and purchase docs. Mirrors sales role for purchases.',
    permissions: [
      'purchases.supplier:read',
      'purchases.supplier:write',
      'purchases.invoice:read',
      'purchases.invoice:write',
      'purchases.invoice:post',
      'purchases.invoice:unpost',
      'purchases.payment_sent:read',
      'purchases.payment_sent:write',
      'purchases.payment_sent:post',
      'purchases.payment_sent:unpost',
      'inventory.product:read',
      'inventory.warehouse:read',
      'inventory.warehouse_stock:read',
      'prices:read',
      'platform.currency:read',
      'reports.purchases:read',
      'reports.purchases:export',
      'reports.inventory:read',
      'attachments:read',
      'attachments:write',
    ],
  },
  sales: {
    description:
      'Own-customer scoped sales rep. Can create invoices and payments for assigned customers only.',
    permissions: [
      'sales.customer:read',
      'sales.customer:write',
      'sales.invoice:read',
      'sales.invoice:write',
      'sales.invoice:post',
      'sales.invoice:unpost',
      'sales.invoice:send_email',
      'sales.payment_received:read',
      'sales.payment_received:write',
      'sales.payment_received:post',
      'sales.payment_received:unpost',
      'inventory.product:read',
      'inventory.warehouse:read',
      'inventory.warehouse_stock:read',
      'prices:read',
      'platform.currency:read',
      'reports.sales:read',
    ],
  },
  warehouse: {
    description: 'Warehouse operator. Handles stock movements. No financial data.',
    permissions: [
      'inventory.product:read',
      'inventory.warehouse:read',
      'inventory.warehouse:write',
      'inventory.warehouse_stock:read',
      'inventory.warehouse_stock:write',
      'inventory.warehouse_stock:post',
      'inventory.warehouse_stock:unpost',
      // Stock documents (count / adjustment / transfer) are separate entities
      // from the warehouse_stock register; the operator needs read+write+post
      // on each to actually do the depocu job. Price-setting is deliberately
      // excluded (that's pricing, not stock).
      'inventory.inventory_count:read',
      'inventory.inventory_count:write',
      'inventory.inventory_count:post',
      'inventory.inventory_count:unpost',
      'inventory.stock_adjustment:read',
      'inventory.stock_adjustment:write',
      'inventory.stock_adjustment:post',
      'inventory.stock_adjustment:unpost',
      'inventory.stock_transfer:read',
      'inventory.stock_transfer:write',
      'inventory.stock_transfer:post',
      'inventory.stock_transfer:unpost',
      'reports.inventory:read',
    ],
  },
};

export const SYSTEM_ROLE_SCOPES: Partial<
  Record<SystemRoleName, Array<{ entityId: string; field: string; operator: 'currentUser' }>>
> = {
  sales: [
    { entityId: 'sales.customer', field: 'assignedRepId', operator: 'currentUser' },
    { entityId: 'sales.invoice', field: 'assignedRepId', operator: 'currentUser' },
    { entityId: 'sales.payment_received', field: 'assignedRepId', operator: 'currentUser' },
  ],
  buyer: [
    { entityId: 'purchases.supplier', field: 'assignedBuyerId', operator: 'currentUser' },
    { entityId: 'purchases.invoice', field: 'assignedBuyerId', operator: 'currentUser' },
    { entityId: 'purchases.payment_sent', field: 'assignedBuyerId', operator: 'currentUser' },
  ],
};

export async function seedSystemRoles(
  tenantId: string,
  tx: PrismaTypes.TransactionClient,
): Promise<void> {
  for (const [name, def] of Object.entries(SYSTEM_ROLE_DEFS) as [
    SystemRoleName,
    (typeof SYSTEM_ROLE_DEFS)[SystemRoleName],
  ][]) {
    const role = await tx.role.upsert({
      where: { tenantId_name: { tenantId, name } },
      create: {
        tenantId,
        name,
        description: def.description,
        isSystem: true,
        permissions: def.permissions,
      },
      update: {
        description: def.description,
        isSystem: true,
        permissions: def.permissions,
      },
    });

    const scopes = SYSTEM_ROLE_SCOPES[name];
    if (scopes) {
      await tx.roleScope.deleteMany({
        where: { roleId: role.id, isSystem: true },
      });
      await tx.roleScope.createMany({
        data: scopes.map((s) => ({
          roleId: role.id,
          entityId: s.entityId,
          field: s.field,
          operator: s.operator,
          value: Prisma.JsonNull,
          isSystem: true,
        })),
      });
    }
  }
}
