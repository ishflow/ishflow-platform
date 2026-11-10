import { randomUUID } from 'node:crypto';
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/registers/accounts-receivable';
import '@/configs/sales/registers/sale';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { getRegistry } from '@/platform/metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { backfillStockCost } from './backfill-stock-cost';
import { createDocument } from './document-crud';
import { postDocument } from './posting';
import { registerBalanceAll } from './register-query';

// ─── Tenant + context ────────────────────────────────────────────────────────

const tenantId = randomUUID();

/**
 * adminCtx shaped just like posting.test.ts — tenant currency TRY so the
 * fx.convert is identity for same-currency docs.
 */
const adminCtx = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantId, currency: 'TRY' } as never,
  membership: { roles: ['admin'] } as never,
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;

// ─── Fixture IDs ─────────────────────────────────────────────────────────────

let warehouseId: string;
let productId: string;
let customerId: string;
let supplierId: string;

// ─── Register configs ────────────────────────────────────────────────────────

const stockRegCfg = getRegistry().register['inventory.stock_balance'];
if (!stockRegCfg) throw new Error('inventory.stock_balance not registered');

const saleRegCfg = getRegistry().register['sales.sale'];
if (!saleRegCfg) throw new Error('sales.sale not registered');

const purchaseInvoiceCfg = getRegistry().document['purchases.invoice'];
if (!purchaseInvoiceCfg) throw new Error('purchases.invoice not registered');

const salesInvoiceCfg = getRegistry().document['sales.invoice'];
if (!salesInvoiceCfg) throw new Error('sales.invoice not registered');

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  warehouseId = randomUUID();
  productId = randomUUID();
  customerId = randomUUID();
  supplierId = randomUUID();

  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'Backfill test',
        slug: `backfill-${tenantId.slice(0, 8)}`,
        currency: 'TRY',
      },
    });
  });

  await withTenant(tenantId, async (tx) => {
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      warehouseId,
      tenantId,
      'WH-1',
      'Main Warehouse',
    );
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_product (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      productId,
      tenantId,
      `KOLA-${tenantId.slice(0, 6)}`,
      'Kola',
    );
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_sales_customer (id, tenant_id, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, NOW(), NOW())',
      customerId,
      tenantId,
      'Kola Customer',
    );
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_purchases_supplier (id, tenant_id, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, NOW(), NOW())',
      supplierId,
      tenantId,
      'Kola Supplier',
    );
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    // Clean up movements
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_inventory_stock_balance WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_sales_sale WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_sales_accounts_receivable WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_purchases_accounts_payable WHERE tenant_id = $1::uuid',
      tenantId,
    );
    // Clean up document lines
    await tx.$executeRawUnsafe(
      'DELETE FROM document_line_purchases_invoice_items WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_line_sales_invoice_items WHERE tenant_id = $1::uuid',
      tenantId,
    );
    // Clean up documents
    await tx.$executeRawUnsafe(
      'DELETE FROM document_purchases_invoice WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_sales_invoice WHERE tenant_id = $1::uuid',
      tenantId,
    );
    // Clean up catalogs
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_purchases_supplier WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_sales_customer WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_product WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_warehouse WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_sequence WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.tenant.delete({ where: { id: tenantId } });
  });
  await prisma.$disconnect();
});

// ─── Kola scenario ───────────────────────────────────────────────────────────

/**
 * Kola scenario:
 *   PI-1 (2026-04-01): buy 1000 units @ TRY 100   → totalCost = 100_000
 *   PI-2 (2026-04-02): buy  500 units @ TRY  90   → totalCost =  45_000
 *   After purchases: stock = 1500 units, totalCost = 145_000, avgCost ≈ 96.6667
 *
 *   SI-1 (2026-04-03): sell 200 units @ TRY 150
 *     cost = 200 * avgCost = 200 * 96.6667 = 19_333.33
 *     revenue = 200 * 150 = 30_000
 *     remaining stock: 1300 units, totalCost ≈ 125_666.67
 *
 * After backfill we verify those final numbers.
 */
describe('backfillStockCost — Kola scenario', () => {
  it('replay produces correct stock_balance and sales.sale after wipe', async () => {
    // --- Create and post Purchase Invoice 1 ---
    const pi1 = await createDocument(adminCtx, purchaseInvoiceCfg, {
      date: new Date('2026-04-01T10:00:00Z'),
      supplier: supplierId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 1000, price: '100' }],
      },
    });
    await postDocument(adminCtx, purchaseInvoiceCfg, pi1.id as string);

    // --- Create and post Purchase Invoice 2 ---
    const pi2 = await createDocument(adminCtx, purchaseInvoiceCfg, {
      date: new Date('2026-04-02T10:00:00Z'),
      supplier: supplierId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 500, price: '90' }],
      },
    });
    await postDocument(adminCtx, purchaseInvoiceCfg, pi2.id as string);

    // --- Create and post Sales Invoice ---
    const si1 = await createDocument(adminCtx, salesInvoiceCfg, {
      date: new Date('2026-04-03T10:00:00Z'),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 200, price: '150' }],
      },
    });
    await postDocument(adminCtx, salesInvoiceCfg, si1.id as string);

    // --- Run backfill ---
    const result = await backfillStockCost(adminCtx);
    expect(result.tenantId).toBe(tenantId);
    expect(result.docsReplayed).toBe(3); // 2 purchase + 1 sales invoice
    expect(result.movementCount).toBeGreaterThan(0);

    // --- Verify stock_balance: quantity = 1300, totalCost ≈ 125_666.67 ---
    const stockBal = await withTenant(tenantId, (tx) =>
      registerBalanceAll(tx, stockRegCfg, { warehouse: warehouseId, product: productId }),
    );
    expect(stockBal.quantity).toBe(1300);
    // totalCost: 145_000 - 200 * (145_000/1500) = 145_000 - 19_333.33 = 125_666.67
    expect(Number(stockBal.totalCost)).toBeCloseTo(125_666.67, 1);

    // --- Verify sales.sale: one movement for the sales invoice ---
    const saleRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_sale: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_sale.findMany({
        where: { docRef: si1.id as string, active: true },
      }),
    );
    expect(saleRows).toHaveLength(1);
    const saleRow = saleRows[0];
    expect(saleRow).toBeDefined();
    // cost = 200 * avgCost ≈ 19_333.33
    expect(Number(saleRow?.cost)).toBeCloseTo(19_333.33, 1);
    // revenue = 200 * 150 = 30_000
    expect(Number(saleRow?.revenue)).toBeCloseTo(30_000, 2);
  });
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe('backfillStockCost — idempotency', () => {
  it('running backfill twice yields identical final state', async () => {
    // Run backfill a second time (docs from the Kola scenario above are still posted).
    const result2 = await backfillStockCost(adminCtx);
    expect(result2.docsReplayed).toBe(3);

    const stockBal = await withTenant(tenantId, (tx) =>
      registerBalanceAll(tx, stockRegCfg, { warehouse: warehouseId, product: productId }),
    );
    expect(stockBal.quantity).toBe(1300);
    expect(Number(stockBal.totalCost)).toBeCloseTo(125_666.67, 1);

    const saleMovements = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_sale: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_sale.findMany({
        where: { active: true },
      }),
    );
    // Still exactly one active sale movement after second run
    expect(saleMovements).toHaveLength(1);
    expect(Number(saleMovements[0]?.cost)).toBeCloseTo(19_333.33, 1);
    expect(Number(saleMovements[0]?.revenue)).toBeCloseTo(30_000, 2);
  });
});
