'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';

export type RefEntity =
  | 'customer'
  | 'supplier'
  | 'product'
  | 'warehouse'
  | 'sales-invoice'
  | 'purchase-invoice'
  | 'product-category'
  | 'product-group'
  | 'price-type'
  | 'cash-register'
  | 'bank-account';

export type RefOption = { id: string; label: string; sublabel?: string };

/**
 * Picker-level filter spec. Plain string→string map so server actions can
 * accept it across the RSC boundary. Recognized keys are entity-specific:
 *  - `staticOnly: '1'` (price-type) → restrict to `kind='static'`.
 *  - `hasStockGt0: '1'` (product) → reserved for future wire-up; today this
 *    filter is applied by the V1 search action, not by V2.
 */
export type RefSearchFilter = Record<string, string>;

export async function searchRefOptions(
  entity: RefEntity,
  q: string,
  filter: RefSearchFilter = {},
): Promise<RefOption[]> {
  const ctx = await requireTenantContext();
  const query = q.trim();
  return withTenant(ctx.tenant.id, async (tx) => {
    switch (entity) {
      case 'customer': {
        const rows = await tx.catalog_sales_customer.findMany({
          where: {
            deletedAt: null,
            ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
          },
          take: 25,
          orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({ id: r.id, label: r.name }));
      }
      case 'supplier': {
        const rows = await tx.catalog_purchases_supplier.findMany({
          where: {
            deletedAt: null,
            ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
          },
          take: 25,
          orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({ id: r.id, label: r.name }));
      }
      case 'product': {
        const rows = await tx.catalog_inventory_product.findMany({
          where: {
            deletedAt: null,
            ...(query
              ? {
                  OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { code: { contains: query, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
          take: 25,
          orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({ id: r.id, label: r.name, sublabel: r.code }));
      }
      case 'warehouse': {
        const rows = await tx.catalog_inventory_warehouse.findMany({
          where: {
            deletedAt: null,
            ...(query
              ? {
                  OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { code: { contains: query, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
          take: 25,
          orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({ id: r.id, label: r.name, sublabel: r.code }));
      }
      case 'sales-invoice': {
        const byParty = filter?.byParty;
        const rows = await tx.document_sales_invoice.findMany({
          where: {
            deletedAt: null,
            ...(byParty ? { customer: byParty } : {}),
            ...(query ? { number: { contains: query, mode: 'insensitive' } } : {}),
          },
          take: 25,
          orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => ({
          id: r.id,
          label: r.number,
          sublabel: r.date?.toISOString().slice(0, 10),
        }));
      }
      case 'purchase-invoice': {
        const byParty = filter?.byParty;
        const rows = await tx.document_purchases_invoice.findMany({
          where: {
            deletedAt: null,
            ...(byParty ? { supplier: byParty } : {}),
            ...(query ? { number: { contains: query, mode: 'insensitive' } } : {}),
          },
          take: 25,
          orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => ({
          id: r.id,
          label: r.number,
          sublabel: r.date?.toISOString().slice(0, 10),
        }));
      }
      case 'product-category': {
        const rows = await tx.catalog_inventory_product_category.findMany({
          where: {
            deletedAt: null,
            ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
          },
          take: 25,
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        });
        return rows.map((r) => ({ id: r.id, label: r.name }));
      }
      case 'product-group': {
        const rows = await tx.catalog_inventory_product_group.findMany({
          where: {
            deletedAt: null,
            ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
          },
          take: 25,
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        });
        return rows.map((r) => ({ id: r.id, label: r.name }));
      }
      case 'price-type': {
        const rows = await tx.catalog_sales_price_type.findMany({
          where: {
            deletedAt: null,
            ...(filter.staticOnly === '1' ? { kind: 'static' } : {}),
            ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
          },
          take: 25,
          orderBy: { name: 'asc' },
          select: { id: true, name: true, kind: true },
        });
        return rows.map((r) => ({ id: r.id, label: r.name, sublabel: r.kind }));
      }
      case 'cash-register': {
        const rows = await tx.catalog_treasury_cash_register.findMany({
          where: {
            deletedAt: null,
            ...(query
              ? {
                  OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { code: { contains: query, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
          take: 25,
          orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({ id: r.id, label: r.name, sublabel: r.code }));
      }
      case 'bank-account': {
        // BankAccount is a legacy Prisma model (no deletedAt). Sublabel shows
        // the currency so users can distinguish a TRY/USD/RUB account at a
        // glance — same disambiguation we do for cash-register codes.
        const rows = await tx.bankAccount.findMany({
          where: query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { accountNo: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {},
          take: 25,
          orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({
          id: r.id,
          label: r.name,
          sublabel: `${r.currency} · ${r.accountNo}`,
        }));
      }
    }
  });
}
