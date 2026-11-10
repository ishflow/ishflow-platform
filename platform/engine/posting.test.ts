import { randomUUID } from 'node:crypto';
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
import '@/configs/sales/registers/sale';
import '@/configs/treasury/catalogs/cash-register';
import '@/configs/treasury/registers/cash-funds';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { getRegistry } from '@/platform/metadata';
import type { DocumentRowWithLines } from '@/platform/metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDocument, getDocument } from './document-crud';
import { InvalidStatusError, PermissionDeniedError, PostingValidationError } from './errors';
import { postDocument, replayPosting, unpostDocument } from './posting';
import { registerBalance } from './register-query';

const tenantId = randomUUID();
const adminCtx = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantId } as never,
  membership: { roles: ['admin'] } as never,
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;

const viewerCtx = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantId } as never,
  membership: { roles: ['viewer'] } as never,
  permissions: new Set<string>(['*:read']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;

const invoiceConfig = getRegistry().document['sales.invoice'];
if (!invoiceConfig) throw new Error('sales.invoice document not registered');

const paymentConfig = getRegistry().document['sales.payment_received'];
if (!paymentConfig) throw new Error('sales.payment_received document not registered');

const purchaseInvoiceConfig = getRegistry().document['purchases.invoice'];
if (!purchaseInvoiceConfig) throw new Error('purchases.invoice document not registered');

const paymentSentConfig = getRegistry().document['purchases.payment_sent'];
if (!paymentSentConfig) throw new Error('purchases.payment_sent document not registered');

const arRegisterCfg = getRegistry().register['sales.accounts_receivable'];
if (!arRegisterCfg) throw new Error('sales.accounts_receivable register not registered');

const apRegisterCfg = getRegistry().register['purchases.accounts_payable'];
if (!apRegisterCfg) throw new Error('purchases.accounts_payable register not registered');

let productId: string;
let customerId: string;
let supplierId: string;
let warehouseId: string;
let warehouseTwoId: string;

async function seedStock(qty: number, warehouse: string = warehouseId) {
  await withTenant(tenantId, (tx) =>
    (
      tx as unknown as {
        movement_inventory_stock_balance: { create: (args: unknown) => Promise<unknown> };
      }
    ).movement_inventory_stock_balance.create({
      data: {
        tenantId,
        docRef: randomUUID(),
        docType: 'seed',
        kind: 'income',
        active: true,
        timestamp: new Date(),
        warehouse,
        product: productId,
        quantity: qty,
        totalCost: 0,
      },
    }),
  );
}

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'Posting test',
        slug: `posting-${tenantId.slice(0, 8)}`,
      },
    });
  });
  // Seed customer, product, supplier, and warehouse using raw queries to avoid depending on catalog CRUD typings.
  customerId = randomUUID();
  productId = randomUUID();
  supplierId = randomUUID();
  warehouseId = randomUUID();
  warehouseTwoId = randomUUID();
  await withTenant(tenantId, async (tx) => {
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_sales_customer (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      customerId,
      tenantId,
      `CUST-${tenantId.slice(0, 6)}`,
      'Posting Test Customer',
    );
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_product (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      productId,
      tenantId,
      `SKU-${tenantId.slice(0, 6)}`,
      'Test Widget',
    );
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_purchases_supplier (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      supplierId,
      tenantId,
      `SUP-${tenantId.slice(0, 6)}`,
      'Posting Test Supplier',
    );
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      warehouseId,
      tenantId,
      'MAIN',
      'Main Test Warehouse',
    );
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      warehouseTwoId,
      tenantId,
      'BRANCH-1',
      'Branch Test Warehouse',
    );
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_inventory_stock_balance WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_sales_accounts_receivable WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_sales_sale WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_sales_invoice WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_sales_payment_received WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_purchases_accounts_payable WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_line_purchases_invoice_items WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_purchases_invoice WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_purchases_payment_sent WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_purchases_supplier WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_product WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_sales_customer WHERE tenant_id = $1::uuid',
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

describe('posting — sales.invoice → inventory.stock_balance', () => {
  it('post writes movements, transitions to POSTED, unpost reverses', async () => {
    await seedStock(10);
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 3, price: '99.99' }],
      },
    });
    const invoiceId = created.id as string;

    const postResult = await postDocument(adminCtx, invoiceConfig, invoiceId);
    // 1 stock_balance movement (per line) + 1 accounts_receivable movement (aggregate) + 1 sales.sale movement = 3
    expect(postResult.movementCount).toBe(3);

    const afterPost = await getDocument(adminCtx, invoiceConfig, invoiceId);
    expect(afterPost.status).toBe('POSTED');
    expect(afterPost.postedAt).toBeTruthy();

    const unpostResult = await unpostDocument(adminCtx, invoiceConfig, invoiceId);
    expect(unpostResult.deactivatedCount).toBe(3);

    const afterUnpost = await getDocument(adminCtx, invoiceConfig, invoiceId);
    expect(afterUnpost.status).toBe('SAVED');
    expect(afterUnpost.postedAt).toBeNull();
  });

  it('prePost validator blocks posting when stock insufficient', async () => {
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 99999, price: '1.00' }],
      },
    });
    await expect(
      postDocument(adminCtx, invoiceConfig, created.id as string),
    ).rejects.toBeInstanceOf(PostingValidationError);

    const doc = await getDocument(adminCtx, invoiceConfig, created.id as string);
    expect(doc.status).toBe('SAVED');
  });

  it('cannot post a document that is already POSTED', async () => {
    await seedStock(10);
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 1, price: '1.00' }],
      },
    });
    await postDocument(adminCtx, invoiceConfig, created.id as string);
    await expect(
      postDocument(adminCtx, invoiceConfig, created.id as string),
    ).rejects.toBeInstanceOf(InvalidStatusError);
  });

  it('viewer role cannot post', async () => {
    await seedStock(10);
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 1, price: '1.00' }],
      },
    });
    await expect(
      postDocument(viewerCtx, invoiceConfig, created.id as string),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it('multi-line invoice posts one movement per line and aggregates stock demand', async () => {
    await seedStock(50);
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [
          { product: productId, quantity: 2, price: '10.00' },
          { product: productId, quantity: 3, price: '10.00' },
        ],
      },
    });
    const invoiceId = created.id as string;
    const postResult = await postDocument(adminCtx, invoiceConfig, invoiceId);
    // 2 stock_balance movements (one per line) + 1 accounts_receivable (aggregate) + 2 sales.sale movements (one per line) = 5
    expect(postResult.movementCount).toBe(5);

    const unpostResult = await unpostDocument(adminCtx, invoiceConfig, invoiceId);
    expect(unpostResult.deactivatedCount).toBe(5);
  });
});

describe('posting — sales.invoice → dual-register (stock_balance + accounts_receivable)', () => {
  it('post writes to both registers; unpost deactivates all rows', async () => {
    await seedStock(50);
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [
          { product: productId, quantity: 2, price: '50.00' },
          { product: productId, quantity: 3, price: '30.00' },
        ],
      },
    });
    const invoiceId = created.id as string;

    // Capture A/R baseline before posting (other tests in this file may leave active rows)
    const baselineBalance = await withTenant(tenantId, (tx) =>
      registerBalance(tx, arRegisterCfg, { customer: customerId }),
    );

    // Total = 2*50 + 3*30 = 100 + 90 = 190
    const postResult = await postDocument(adminCtx, invoiceConfig, invoiceId);
    // 2 stock_balance rows (one per line) + 1 A/R row + 2 sales.sale rows (one per line) = 5
    expect(postResult.movementCount).toBe(5);

    // --- Verify stock_balance movements ---
    const stockRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_inventory_stock_balance: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_inventory_stock_balance.findMany({
        where: { docRef: invoiceId, active: true },
      }),
    );
    expect(stockRows).toHaveLength(2);

    // --- Verify A/R movement (scoped to this invoice's docRef) ---
    const arRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: invoiceId, active: true },
      }),
    );
    expect(arRows).toHaveLength(1);
    const arRow = arRows[0];
    expect(arRow).toBeDefined();
    expect(arRow?.kind).toBe('income');
    expect(arRow?.customer).toBe(customerId);
    expect(Number(arRow?.amount)).toBe(190);

    // --- Verify sales.sale movements (one per line) ---
    const saleRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_sale: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_sale.findMany({
        where: { docRef: invoiceId, active: true },
        orderBy: { quantity: 'asc' },
      }),
    );
    expect(saleRows).toHaveLength(2);
    // Both rows should reference this invoice's customer as counterparty
    for (const row of saleRows) {
      expect(row.kind).toBe('income');
      expect(row.counterparty).toBe(customerId);
      expect(String(row.cost)).toBe('0');
    }
    // Line 0: qty=2, price=50 → revenue=100
    const saleRow0 = saleRows.find((r) => Number(r.quantity) === 2);
    expect(saleRow0).toBeDefined();
    expect(saleRow0?.product).toBe(productId);
    expect(Number(saleRow0?.revenue)).toBe(100);
    // Line 1: qty=3, price=30 → revenue=90
    const saleRow1 = saleRows.find((r) => Number(r.quantity) === 3);
    expect(saleRow1).toBeDefined();
    expect(saleRow1?.product).toBe(productId);
    expect(Number(saleRow1?.revenue)).toBe(90);

    // --- registerBalance on A/R increased by exactly 190 ---
    const balanceAfterPost = await withTenant(tenantId, (tx) =>
      registerBalance(tx, arRegisterCfg, { customer: customerId }),
    );
    expect(balanceAfterPost.quantity).toBe(baselineBalance.quantity + 190);

    // --- Unpost deactivates all movements ---
    const unpostResult = await unpostDocument(adminCtx, invoiceConfig, invoiceId);
    expect(unpostResult.deactivatedCount).toBe(5);

    // All rows should now be inactive
    const stockRowsAfterUnpost = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_inventory_stock_balance: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_inventory_stock_balance.findMany({
        where: { docRef: invoiceId },
      }),
    );
    expect(stockRowsAfterUnpost.every((r) => r.active === false)).toBe(true);

    const arRowsAfterUnpost = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: invoiceId },
      }),
    );
    expect(arRowsAfterUnpost.every((r) => r.active === false)).toBe(true);

    // registerBalance on A/R decreased back to baseline after unpost
    const balanceAfterUnpost = await withTenant(tenantId, (tx) =>
      registerBalance(tx, arRegisterCfg, { customer: customerId }),
    );
    expect(balanceAfterUnpost.quantity).toBe(baselineBalance.quantity);
  });
});

describe('posting — sales.payment_received → sales.accounts_receivable', () => {
  it('post writes expense movement; unpost deactivates and balance returns to 0', async () => {
    const created = await createDocument(adminCtx, paymentConfig, {
      date: new Date(),
      customer: customerId,
      amount: '250.00',
    });
    const paymentId = created.id as string;

    await postDocument(adminCtx, paymentConfig, paymentId);

    // Verify the A/R movement (scoped to this payment's docRef)
    const arRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: paymentId, active: true },
      }),
    );
    expect(arRows).toHaveLength(1);
    const arRow = arRows[0];
    expect(arRow).toBeDefined();
    expect(arRow?.kind).toBe('expense');
    expect(arRow?.customer).toBe(customerId);
    expect(Number(arRow?.amount)).toBeCloseTo(250, 2);

    // Capture baseline before checking net — other tests may have left active A/R rows.
    // The payment contribution is exactly -250, so A/R balance should be (baseline - 250).
    const arBalance = await withTenant(tenantId, (tx) =>
      registerBalance(tx, arRegisterCfg, { customer: customerId }),
    );
    // Payment is expense → signed contribution is -250. The row's amount equals 250.
    // The net change from this one payment must be exactly -250.
    const baseBeforeUnpost = arBalance.quantity;

    await unpostDocument(adminCtx, paymentConfig, paymentId);

    const arRowsAfterUnpost = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: paymentId },
      }),
    );
    expect(arRowsAfterUnpost.every((r) => r.active === false)).toBe(true);

    const balanceAfterUnpost = await withTenant(tenantId, (tx) =>
      registerBalance(tx, arRegisterCfg, { customer: customerId }),
    );
    // After unpost, balance increased by exactly 250 (deactivated expense row)
    expect(balanceAfterUnpost.quantity).toBe(baseBeforeUnpost + 250);
  });

  it('invoice + payment combination yields correct A/R net balance', async () => {
    // Seed stock so the invoice prePost validator passes
    await seedStock(100);

    // Post invoice: 5 qty * 80 price = 400
    const invoice = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 5, price: '80.00' }],
      },
    });
    await postDocument(adminCtx, invoiceConfig, invoice.id as string);

    // Post payment of 250
    const payment = await createDocument(adminCtx, paymentConfig, {
      date: new Date(),
      customer: customerId,
      amount: '250.00',
    });
    await postDocument(adminCtx, paymentConfig, payment.id as string);

    // Net change from these two docs = +400 (income) − 250 (expense) = +150
    // Verify by querying the two specific movement rows
    const invoiceArRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: invoice.id as string, active: true },
      }),
    );
    expect(invoiceArRows).toHaveLength(1);
    expect(Number(invoiceArRows[0]?.amount)).toBe(400);
    expect(invoiceArRows[0]?.kind).toBe('income');

    const paymentArRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: payment.id as string, active: true },
      }),
    );
    expect(paymentArRows).toHaveLength(1);
    expect(Number(paymentArRows[0]?.amount)).toBeCloseTo(250, 2);
    expect(paymentArRows[0]?.kind).toBe('expense');

    // registerBalance reflects the net of ALL active movements for this customer
    const balanceBefore = await withTenant(tenantId, (tx) =>
      registerBalance(tx, arRegisterCfg, { customer: customerId }),
    );

    // Unpost both and verify balance decreases by 150
    await unpostDocument(adminCtx, invoiceConfig, invoice.id as string);
    await unpostDocument(adminCtx, paymentConfig, payment.id as string);

    const balanceAfter = await withTenant(tenantId, (tx) =>
      registerBalance(tx, arRegisterCfg, { customer: customerId }),
    );
    expect(balanceBefore.quantity - balanceAfter.quantity).toBe(150);
  });

  it('cannot post a payment_received that is already POSTED', async () => {
    const created = await createDocument(adminCtx, paymentConfig, {
      date: new Date(),
      customer: customerId,
      amount: '100.00',
    });
    const paymentId = created.id as string;

    await postDocument(adminCtx, paymentConfig, paymentId);

    await expect(postDocument(adminCtx, paymentConfig, paymentId)).rejects.toBeInstanceOf(
      InvalidStatusError,
    );

    // Clean up
    await unpostDocument(adminCtx, paymentConfig, paymentId);
  });
});

describe('posting — purchases.payment_sent → purchases.accounts_payable', () => {
  it('posting a payment_sent decreases A/P balance for the supplier', async () => {
    // Arrange: create + post a purchase invoice to put 500 on the A/P ledger.
    // Line price 500 x qty 1 = 500 debt to supplier.
    const invoice = await createDocument(adminCtx, purchaseInvoiceConfig, {
      date: new Date(),
      supplier: supplierId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 1, price: '500.00' }],
      },
    });
    await postDocument(adminCtx, purchaseInvoiceConfig, invoice.id as string);

    const balanceAfterInvoice = await withTenant(tenantId, (tx) =>
      registerBalance(tx, apRegisterCfg, { supplier: supplierId }),
    );

    // Act: post a payment_sent for 200 against the same supplier.
    const payment = await createDocument(adminCtx, paymentSentConfig, {
      date: new Date(),
      supplier: supplierId,
      amount: '200.00',
      note: 'partial settlement',
    });
    await postDocument(adminCtx, paymentSentConfig, payment.id as string);

    // Assert: the movement row is an 'expense' against A/P.
    const paymentApRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_purchases_accounts_payable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_purchases_accounts_payable.findMany({
        where: { docRef: payment.id as string, active: true },
      }),
    );
    expect(paymentApRows).toHaveLength(1);
    expect(paymentApRows[0]?.kind).toBe('expense');
    expect(paymentApRows[0]?.supplier).toBe(supplierId);
    expect(Number(paymentApRows[0]?.amount)).toBeCloseTo(200, 2);

    // Net balance: dropped by exactly 200 from the prior baseline.
    const balanceAfterPayment = await withTenant(tenantId, (tx) =>
      registerBalance(tx, apRegisterCfg, { supplier: supplierId }),
    );
    expect(balanceAfterInvoice.quantity - balanceAfterPayment.quantity).toBeCloseTo(200, 2);

    // Unpost both and verify restoration.
    await unpostDocument(adminCtx, paymentSentConfig, payment.id as string);
    await unpostDocument(adminCtx, purchaseInvoiceConfig, invoice.id as string);

    // Compare to baseline before either doc: should be the same.
    const balanceAfterUnpostAll = await withTenant(tenantId, (tx) =>
      registerBalance(tx, apRegisterCfg, { supplier: supplierId }),
    );
    expect(balanceAfterInvoice.quantity - balanceAfterPayment.quantity).toBeCloseTo(200, 2);
    // Baseline check: after unposting both, the net change from these two docs
    // combined is zero (invoice +500, payment -200 == +300; unpost removes both).
    expect(balanceAfterUnpostAll.quantity).toBeCloseTo(balanceAfterInvoice.quantity - 500, 2);
  });
});

describe('posting — inventory.stock_balance per-warehouse isolation', () => {
  it('isolates stock balances per warehouse', async () => {
    const stockRegisterCfg = getRegistry().register['inventory.stock_balance'];
    if (!stockRegisterCfg) throw new Error('inventory.stock_balance register not registered');

    const whABaseline = await withTenant(tenantId, (tx) =>
      registerBalance(tx, stockRegisterCfg, {
        warehouse: warehouseId,
        product: productId,
      }),
    );
    const whBBaseline = await withTenant(tenantId, (tx) =>
      registerBalance(tx, stockRegisterCfg, {
        warehouse: warehouseTwoId,
        product: productId,
      }),
    );

    // +10 into WH1, +5 into WH2.
    await seedStock(10, warehouseId);
    await seedStock(5, warehouseTwoId);

    const whAAfter = await withTenant(tenantId, (tx) =>
      registerBalance(tx, stockRegisterCfg, {
        warehouse: warehouseId,
        product: productId,
      }),
    );
    const whBAfter = await withTenant(tenantId, (tx) =>
      registerBalance(tx, stockRegisterCfg, {
        warehouse: warehouseTwoId,
        product: productId,
      }),
    );

    expect(whAAfter.quantity - whABaseline.quantity).toBe(10);
    expect(whBAfter.quantity - whBBaseline.quantity).toBe(5);
  });
});

describe('posting — base currency A/R', () => {
  it('posts invoice total in base currency (no conversion needed)', async () => {
    await seedStock(10);
    const invoiceId = (
      await createDocument(adminCtx, invoiceConfig, {
        date: new Date('2026-04-10'),
        customer: customerId,
        warehouse: warehouseId,
        lines: {
          items: [{ product: productId, quantity: 1, price: '100.00' }],
        },
      })
    ).id as string;

    await postDocument(adminCtx, invoiceConfig, invoiceId);

    const arRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: invoiceId, active: true },
      }),
    );
    expect(arRows).toHaveLength(1);
    const row = arRows[0];
    expect(Number(row?.amount)).toBeCloseTo(100.0, 2); // base currency, no conversion
  });
});

describe('replayPosting', () => {
  it('writes movement rows without transitioning doc status or writing an audit entry', async () => {
    // Seed enough stock so the prePost validator passes.
    await seedStock(20);

    // Create a SAVED invoice (same fixture pattern as postDocument tests above).
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 2, price: '50.00' }],
      },
    });
    const docId = created.id as string;

    // Call replayPosting inside a tenant tx (it does not open its own transaction).
    const { movementCount } = await withTenant(tenantId, async (tx) => {
      // Load the doc header + lines — mirrors what postDocument does internally.
      const docHeader = (await (
        tx as unknown as {
          document_sales_invoice: { findUnique: (args: unknown) => Promise<unknown> };
        }
      ).document_sales_invoice.findUnique({ where: { id: docId } })) as DocumentRowWithLines;

      const lineRows = await (
        tx as unknown as {
          documentLine_sales_invoice_items: { findMany: (args: unknown) => Promise<unknown[]> };
        }
      ).documentLine_sales_invoice_items.findMany({
        where: { documentId: docId },
        orderBy: { sequence: 'asc' },
      });
      const doc: DocumentRowWithLines = {
        ...docHeader,
        lines: { items: lineRows as Record<string, unknown>[] },
      };

      return replayPosting(tx, adminCtx, invoiceConfig, doc, docId);
    });

    // 1. movementCount is non-zero (1 stock_balance + 1 A/R + 1 sale = 3).
    expect(movementCount).toBeGreaterThan(0);
    expect(movementCount).toBe(3);

    // 2. Document status is still SAVED — no status transition.
    const docAfter = await getDocument(adminCtx, invoiceConfig, docId);
    expect(docAfter.status).toBe('SAVED');
    expect((docAfter as Record<string, unknown>).postedAt).toBeNull();

    // 3. No audit log entry for 'post' action on this document.
    const auditRows = await withBypass(async (tx) => {
      return tx.auditLog.findMany({
        where: { entityId: docId, action: 'post' },
      });
    });
    expect(auditRows).toHaveLength(0);

    // 4. Movement rows have the expected shape — same as postDocument would write.
    const stockRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_inventory_stock_balance: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_inventory_stock_balance.findMany({
        where: { docRef: docId, active: true },
      }),
    );
    expect(stockRows).toHaveLength(1);
    expect(stockRows[0]?.kind).toBe('expense');
    expect(Number(stockRows[0]?.quantity)).toBe(2);

    const arRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: docId, active: true },
      }),
    );
    expect(arRows).toHaveLength(1);
    expect(arRows[0]?.kind).toBe('income');
    expect(Number(arRows[0]?.amount)).toBe(100); // qty=2, price=50 → 100
  });
});

describe('posting — sales.payment_received with linkedInvoices', () => {
  it('posts per-invoice movements with relatedDocRef; unpost deactivates all', async () => {
    // Arrange: create + post two invoices.
    await seedStock(100);
    const invoice1 = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 1, price: '100.00' }],
      },
    });
    const invoice2 = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 1, price: '200.00' }],
      },
    });
    await postDocument(adminCtx, invoiceConfig, invoice1.id as string);
    await postDocument(adminCtx, invoiceConfig, invoice2.id as string);

    // Act: post payment linking both invoices (100 + 200 = 300).
    const payment = await createDocument(adminCtx, paymentConfig, {
      date: new Date(),
      customer: customerId,
      amount: '300.00',
      linkedInvoices: JSON.stringify([
        { invoiceId: invoice1.id, amount: 100 },
        { invoiceId: invoice2.id, amount: 200 },
      ]),
    });
    await postDocument(adminCtx, paymentConfig, payment.id as string);

    // Assert: two A/R expense rows with relatedDocRef set.
    const arRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: payment.id as string, active: true },
      }),
    );
    expect(arRows).toHaveLength(2);
    const row1 = arRows.find((r) => r.relatedDocRef === invoice1.id);
    const row2 = arRows.find((r) => r.relatedDocRef === invoice2.id);
    expect(row1).toBeDefined();
    expect(row2).toBeDefined();
    expect(Number(row1?.amount)).toBeCloseTo(100, 2);
    expect(Number(row2?.amount)).toBeCloseTo(200, 2);

    // Unpost removes both rows.
    await unpostDocument(adminCtx, paymentConfig, payment.id as string);
    const arRowsAfter = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: payment.id as string },
      }),
    );
    expect(arRowsAfter.every((r) => r.active === false)).toBe(true);

    // Cleanup invoices.
    await unpostDocument(adminCtx, invoiceConfig, invoice1.id as string);
    await unpostDocument(adminCtx, invoiceConfig, invoice2.id as string);
  });

  it('rejects posting when linked total does not match payment amount', async () => {
    const payment = await createDocument(adminCtx, paymentConfig, {
      date: new Date(),
      customer: customerId,
      amount: '100.00',
      linkedInvoices: JSON.stringify([
        { invoiceId: '11111111-1111-1111-1111-111111111111', amount: 50 },
      ]),
    });
    await expect(postDocument(adminCtx, paymentConfig, payment.id as string)).rejects.toThrow(
      'INVALID_LINKED_TOTAL',
    );
  });

  it('falls back to single movement when linkedInvoices is absent', async () => {
    const payment = await createDocument(adminCtx, paymentConfig, {
      date: new Date(),
      customer: customerId,
      amount: '150.00',
    });
    await postDocument(adminCtx, paymentConfig, payment.id as string);

    const arRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_sales_accounts_receivable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_sales_accounts_receivable.findMany({
        where: { docRef: payment.id as string, active: true },
      }),
    );
    expect(arRows).toHaveLength(1);
    expect(arRows[0]?.relatedDocRef).toBeNull();
    expect(Number(arRows[0]?.amount)).toBeCloseTo(150, 2);

    await unpostDocument(adminCtx, paymentConfig, payment.id as string);
  });
});

describe('posting — purchases.payment_sent with linkedInvoices', () => {
  it('posts per-invoice movements with relatedDocRef; unpost deactivates all', async () => {
    // Arrange: create + post two purchase invoices.
    const invoice1 = await createDocument(adminCtx, purchaseInvoiceConfig, {
      date: new Date(),
      supplier: supplierId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 1, price: '150.00' }],
      },
    });
    const invoice2 = await createDocument(adminCtx, purchaseInvoiceConfig, {
      date: new Date(),
      supplier: supplierId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productId, quantity: 1, price: '250.00' }],
      },
    });
    await postDocument(adminCtx, purchaseInvoiceConfig, invoice1.id as string);
    await postDocument(adminCtx, purchaseInvoiceConfig, invoice2.id as string);

    // Act: post payment linking both invoices (150 + 250 = 400).
    const payment = await createDocument(adminCtx, paymentSentConfig, {
      date: new Date(),
      supplier: supplierId,
      amount: '400.00',
      linkedInvoices: JSON.stringify([
        { invoiceId: invoice1.id, amount: 150 },
        { invoiceId: invoice2.id, amount: 250 },
      ]),
    });
    await postDocument(adminCtx, paymentSentConfig, payment.id as string);

    // Assert: two A/P expense rows with relatedDocRef set.
    const apRows = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_purchases_accounts_payable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_purchases_accounts_payable.findMany({
        where: { docRef: payment.id as string, active: true },
      }),
    );
    expect(apRows).toHaveLength(2);
    const row1 = apRows.find((r) => r.relatedDocRef === invoice1.id);
    const row2 = apRows.find((r) => r.relatedDocRef === invoice2.id);
    expect(row1).toBeDefined();
    expect(row2).toBeDefined();
    expect(Number(row1?.amount)).toBeCloseTo(150, 2);
    expect(Number(row2?.amount)).toBeCloseTo(250, 2);

    // Unpost removes both rows.
    await unpostDocument(adminCtx, paymentSentConfig, payment.id as string);
    const apRowsAfter = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          movement_purchases_accounts_payable: {
            findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          };
        }
      ).movement_purchases_accounts_payable.findMany({
        where: { docRef: payment.id as string },
      }),
    );
    expect(apRowsAfter.every((r) => r.active === false)).toBe(true);

    // Cleanup invoices.
    await unpostDocument(adminCtx, purchaseInvoiceConfig, invoice1.id as string);
    await unpostDocument(adminCtx, purchaseInvoiceConfig, invoice2.id as string);
  });

  it('rejects posting when linked total does not match payment amount', async () => {
    const payment = await createDocument(adminCtx, paymentSentConfig, {
      date: new Date(),
      supplier: supplierId,
      amount: '100.00',
      linkedInvoices: JSON.stringify([
        { invoiceId: '11111111-1111-1111-1111-111111111111', amount: 50 },
      ]),
    });
    await expect(postDocument(adminCtx, paymentSentConfig, payment.id as string)).rejects.toThrow(
      'INVALID_LINKED_TOTAL',
    );
  });
});
