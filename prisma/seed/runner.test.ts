import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/documents/payment-sent';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/payment-received';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/registers/accounts-receivable';

import type { AppContext } from '@/platform/auth/current-context';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { seedDemo } from './runner';

function makeCtx(tenantId: string, userId: string): AppContext {
  return {
    user: { id: userId } as never,
    tenant: { id: tenantId } as never,
    membership: { roles: ['admin'] } as never,
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map(),
    addons: new Set(),
  } as AppContext;
}

const tenantA = randomUUID();
const tenantB = randomUUID();
const userA = randomUUID();
const userB = randomUUID();

beforeAll(async () => {
  await withBypass(async (tx) => {
    for (const { id, slug } of [
      { id: tenantA, slug: `seedtest-a-${tenantA.slice(0, 8)}` },
      { id: tenantB, slug: `seedtest-b-${tenantB.slice(0, 8)}` },
    ]) {
      await tx.tenant.create({
        data: {
          id,
          clerkOrgId: `org_${id}`,
          name: `Seed Test ${slug}`,
          slug,
        },
      });
    }
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    for (const id of [tenantA, tenantB]) {
      await tx.$executeRawUnsafe(
        'DELETE FROM movement_inventory_stock_balance WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM movement_sales_accounts_receivable WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_line_sales_invoice_items WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_sales_invoice WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_sales_payment_received WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM movement_purchases_accounts_payable WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_line_purchases_invoice_items WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_purchases_invoice WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_purchases_supplier WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_inventory_product WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_sales_customer WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_inventory_warehouse WHERE tenant_id = $1::uuid',
        id,
      );
      await tx.$executeRawUnsafe('DELETE FROM document_sequence WHERE tenant_id = $1::uuid', id);
      await tx.tenant.delete({ where: { id } });
    }
  });
  await prisma.$disconnect();
});

describe('seedDemo — multi-tenant isolation', () => {
  it('seeds a fresh tenant with ALL buckets filled (customers, products, invoices, payments, stock, suppliers, purchases)', async () => {
    const result = await seedDemo(makeCtx(tenantA, userA));
    expect(result.customers).toBe(20);
    expect(result.products).toBe(50);
    expect(result.invoices.posted + result.invoices.drafts).toBe(30);
    expect(result.payments.posted + result.payments.drafts).toBe(5);
    expect(result.suppliers).toBe(8);
    expect(result.purchaseInvoices.posted + result.purchaseInvoices.drafts).toBe(10);
    expect(result.paymentsSent.posted + result.paymentsSent.drafts).toBe(5);

    // 50 initial-stock seed rows + one outflow per posted invoice line.
    const stockMovements = await withBypass((tx) =>
      tx.$queryRawUnsafe<{ count: bigint }[]>(
        'SELECT COUNT(*)::bigint as count FROM movement_inventory_stock_balance WHERE tenant_id = $1::uuid',
        tenantA,
      ),
    );
    expect(Number(stockMovements[0]?.count ?? 0)).toBeGreaterThanOrEqual(50);

    // Posted purchase invoices produce A/P income movements + stock-balance income movements.
    const apMovements = await withBypass((tx) =>
      tx.$queryRawUnsafe<{ count: bigint }[]>(
        'SELECT COUNT(*)::bigint as count FROM movement_purchases_accounts_payable WHERE tenant_id = $1::uuid AND active = true',
        tenantA,
      ),
    );
    expect(Number(apMovements[0]?.count ?? 0)).toBeGreaterThanOrEqual(
      result.purchaseInvoices.posted,
    );
  }, 60_000);

  it('can seed a SECOND fresh tenant with the same deterministic SKUs (proves tenant-scoped unique)', async () => {
    const result = await seedDemo(makeCtx(tenantB, userB));
    expect(result.customers).toBe(20);
    expect(result.products).toBe(50);
    expect(result.invoices.posted + result.invoices.drafts).toBe(30);
    expect(result.payments.posted + result.payments.drafts).toBe(5);
    expect(result.suppliers).toBe(8);
    expect(result.purchaseInvoices.posted + result.purchaseInvoices.drafts).toBe(10);
    expect(result.paymentsSent.posted + result.paymentsSent.drafts).toBe(5);

    // Both tenants now hold SKU-0001; global @unique would have rejected the second.
    const sameSkus = await withBypass((tx) =>
      tx.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint as count
             FROM catalog_inventory_product
            WHERE code = $1 AND tenant_id IN ($2::uuid, $3::uuid)`,
        'SKU-0001',
        tenantA,
        tenantB,
      ),
    );
    expect(Number(sameSkus[0]?.count ?? 0)).toBe(2);
  }, 60_000);

  it('is idempotent — re-running on a populated tenant returns zero new records', async () => {
    const result = await seedDemo(makeCtx(tenantA, userA));
    expect(result.customers).toBe(0);
    expect(result.products).toBe(0);
    expect(result.invoices.posted + result.invoices.drafts).toBe(0);
    expect(result.payments.posted + result.payments.drafts).toBe(0);
    expect(result.suppliers).toBe(0);
    expect(result.purchaseInvoices.posted + result.purchaseInvoices.drafts).toBe(0);
    expect(result.paymentsSent.posted + result.paymentsSent.drafts).toBe(0);
  }, 60_000);
});
