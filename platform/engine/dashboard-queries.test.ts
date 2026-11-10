import { randomUUID } from 'node:crypto';
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/stock-balance';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/registers/accounts-receivable';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, describe, expect, it } from 'vitest';
import {
  accountsReceivableTotal,
  lowStockCount,
  positiveBalanceTotal,
  upcomingReceivables,
} from './dashboard-queries';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StockProduct = { id: string; onHand: number };

/**
 * Creates an isolated tenant and seeds movement_inventory_stock_balance rows
 * so that each product has the given `onHand` quantity (income movement with
 * active=true). Returns a TenantCtx shaped like the one dashboard-queries
 * functions expect (same pattern as posting.test.ts).
 */
async function seedTenantWithInventory(opts: { products: StockProduct[] }) {
  const tenantId = randomUUID();
  const warehouseId = randomUUID();

  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: `dashboard-test-${tenantId.slice(0, 6)}`,
        slug: `dt-${tenantId.slice(0, 8)}`,
      },
    });
  });

  await withTenant(tenantId, (tx) =>
    tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      warehouseId,
      tenantId,
      `WH-${tenantId.slice(0, 6)}`,
      'Dashboard test warehouse',
    ),
  );

  await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_inventory_stock_balance: { create: (args: unknown) => Promise<unknown> };
    };
    for (const p of opts.products) {
      await bag.movement_inventory_stock_balance.create({
        data: {
          tenantId,
          docRef: randomUUID(),
          docType: 'test',
          warehouse: warehouseId,
          kind: 'income',
          active: true,
          timestamp: new Date(),
          product: p.id,
          quantity: p.onHand,
          totalCost: 0,
        },
      });
    }
  });

  const ctx = {
    user: { id: randomUUID() } as never,
    tenant: { id: tenantId } as never,
    membership: { roles: ['admin'] } as never,
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map<string, unknown>(),
    addons: new Set(),
  } as never;
  return { ctx, tenantId };
}

// ─── Teardown ────────────────────────────────────────────────────────────────
const createdTenants: string[] = [];

afterAll(async () => {
  if (createdTenants.length > 0) {
    await withBypass(async (tx) => {
      const placeholders = createdTenants.map((_, i) => `$${i + 1}::uuid`).join(', ');
      await tx.$executeRawUnsafe(
        `DELETE FROM movement_inventory_stock_balance WHERE tenant_id IN (${placeholders})`,
        ...createdTenants,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM movement_sales_accounts_receivable WHERE tenant_id IN (${placeholders})`,
        ...createdTenants,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM document_sales_invoice WHERE tenant_id IN (${placeholders})`,
        ...createdTenants,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM catalog_sales_customer WHERE tenant_id IN (${placeholders})`,
        ...createdTenants,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM catalog_inventory_product WHERE tenant_id IN (${placeholders})`,
        ...createdTenants,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM catalog_inventory_warehouse WHERE tenant_id IN (${placeholders})`,
        ...createdTenants,
      );
      await tx.tenant.deleteMany({ where: { id: { in: createdTenants } } });
    });
  }
  await prisma.$disconnect();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('lowStockCount', () => {
  it('returns count of products with on-hand < threshold and the threshold used', async () => {
    const { ctx, tenantId } = await seedTenantWithInventory({
      products: [
        { id: randomUUID(), onHand: 0 },
        { id: randomUUID(), onHand: 3 },
        { id: randomUUID(), onHand: 12 },
      ],
    });
    createdTenants.push(tenantId);
    const result = await lowStockCount(ctx, 5);
    expect(result.count).toBe(2);
    expect(result.threshold).toBe(5);
  });

  it('defaults threshold to 5 when not provided', async () => {
    const { ctx, tenantId } = await seedTenantWithInventory({
      products: [{ id: randomUUID(), onHand: 4 }],
    });
    createdTenants.push(tenantId);
    const result = await lowStockCount(ctx);
    expect(result.threshold).toBe(5);
    expect(result.count).toBe(1);
  });
});

// ─── upcomingReceivables fixture + tests ─────────────────────────────────────

async function seedTenantWithCustomerAR(opts: {
  customers: Array<{ name: string }>;
  invoices: Array<{ customerIdx: number; daysAgo: number; amount: number }>;
}) {
  const tenantId = randomUUID();
  const warehouseId = randomUUID();

  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: `dashboard-ar-${tenantId.slice(0, 6)}`,
        slug: `da-${tenantId.slice(0, 8)}`,
      },
    });
  });
  createdTenants.push(tenantId);

  // Create customers + warehouse + 1 product (just enough for invoice posting)
  const customerIds = opts.customers.map(() => randomUUID());
  const productId = randomUUID();
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      warehouseId,
      tenantId,
      `WH-${tenantId.slice(0, 6)}`,
      'AR test warehouse',
    );
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_product (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      productId,
      tenantId,
      `PRD-${tenantId.slice(0, 6)}`,
      'AR test product',
    );
    for (const [i, customer] of opts.customers.entries()) {
      await tx.$executeRawUnsafe(
        'INSERT INTO catalog_sales_customer (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
        customerIds[i],
        tenantId,
        `CUST-${i}`,
        customer.name,
      );
    }
  });

  // For each invoice, write the document row in POSTED status + matching A/R income movement
  await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      document_sales_invoice: { create: (args: unknown) => Promise<{ id: string }> };
      movement_sales_accounts_receivable: { create: (args: unknown) => Promise<unknown> };
    };
    let n = 1;
    for (const inv of opts.invoices) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - inv.daysAgo);
      date.setUTCHours(12, 0, 0, 0);
      const doc = await bag.document_sales_invoice.create({
        data: {
          tenantId,
          number: `T-INV-${tenantId.slice(0, 4)}-${n++}`,
          date,
          status: 'POSTED',
          postedAt: date,
          customer: customerIds[inv.customerIdx],
          warehouse: warehouseId,
        },
      });
      await bag.movement_sales_accounts_receivable.create({
        data: {
          tenantId,
          docRef: doc.id,
          docType: 'sales.invoice',
          kind: 'income',
          active: true,
          timestamp: date,
          customer: customerIds[inv.customerIdx],
          amount: inv.amount,
        },
      });
    }
  });

  const ctx = {
    user: { id: randomUUID() } as never,
    tenant: { id: tenantId } as never,
    membership: { roles: ['admin'] } as never,
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map<string, unknown>(),
    addons: new Set(),
  } as never;
  return { ctx, tenantId, customerIds };
}

// ─── accountsReceivableTotal rollup tests ────────────────────────────────────

/**
 * Lean fixture for AR rollup math. Skips documents + customer rows entirely;
 * the rollup only reads movement rows, so this keeps the seed off the brittle
 * upstream NOT-NULL columns that broke the existing fixture.
 */
async function seedTenantWithRawArMovements(opts: {
  baseCurrency?: string;
  movements: Array<{
    kind: 'income' | 'expense';
    amount: number;
    timestamp?: Date;
    /** Defaults to a single shared customer so movements net per-customer. */
    customer?: string;
  }>;
}) {
  const tenantId = randomUUID();
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: `dashboard-ar-roll-${tenantId.slice(0, 6)}`,
        slug: `daroll-${tenantId.slice(0, 8)}`,
        currency: opts.baseCurrency ?? 'USD',
      },
    });
  });
  createdTenants.push(tenantId);

  // Seed AR movements directly (no source doc — the rollup doesn't join).
  const sharedCustomerId = randomUUID();
  await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_sales_accounts_receivable: { create: (args: unknown) => Promise<unknown> };
    };
    for (const m of opts.movements) {
      await bag.movement_sales_accounts_receivable.create({
        data: {
          tenantId,
          docRef: randomUUID(),
          docType: 'sales.invoice',
          kind: m.kind,
          active: true,
          timestamp: m.timestamp ?? new Date(),
          customer: m.customer ?? sharedCustomerId,
          amount: m.amount,
        },
      });
    }
  });

  const ctx = {
    user: { id: randomUUID() } as never,
    tenant: { id: tenantId, currency: opts.baseCurrency ?? 'USD' } as never,
    membership: { roles: ['admin'] } as never,
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map<string, unknown>(),
    addons: new Set(),
  } as never;
  return { ctx, tenantId };
}

describe('accountsReceivableTotal', () => {
  it('nets income − expense within a customer', async () => {
    const { ctx } = await seedTenantWithRawArMovements({
      baseCurrency: 'USD',
      movements: [
        { kind: 'income', amount: 500 },
        { kind: 'expense', amount: 200 },
      ],
    });
    const result = await accountsReceivableTotal(ctx);
    expect(result.current).toBe(300); // same customer: 500 − 200
  });

  it('excludes a customer in credit (negative balance) from the total', async () => {
    const owing = randomUUID();
    const credit = randomUUID();
    const { ctx } = await seedTenantWithRawArMovements({
      baseCurrency: 'USD',
      movements: [
        { kind: 'income', amount: 1920, customer: owing }, // owes 1920
        { kind: 'expense', amount: 120, customer: credit }, // 120 in credit
      ],
    });
    const result = await accountsReceivableTotal(ctx);
    // Receivables = the owing customer only (1920); the 120 credit is a
    // separate liability, NOT netted in — matches the A/R register + aging
    // report (QA #57 / dashboard-vs-register divergence).
    expect(result.current).toBe(1920);
  });
});

describe('positiveBalanceTotal', () => {
  it('sums only positive per-party balances', () => {
    expect(
      positiveBalanceTotal([
        { party: 'a', kind: 'income', amount: 100 },
        { party: 'a', kind: 'expense', amount: 30 }, // a = 70
        { party: 'b', kind: 'income', amount: 50 },
        { party: 'b', kind: 'expense', amount: 80 }, // b = −30 (credit, excluded)
      ]),
    ).toBe(70);
  });

  it('returns 0 for no rows', () => {
    expect(positiveBalanceTotal([])).toBe(0);
  });
});

describe('upcomingReceivables', () => {
  it('returns one row per customer even when customer has multiple overdue invoices', async () => {
    const { ctx } = await seedTenantWithCustomerAR({
      customers: [{ name: 'Multi Invoice Co.' }, { name: 'Single Invoice Inc.' }],
      invoices: [
        // Two invoices for customer 0, both in the due window (≥23 days old)
        { customerIdx: 0, daysAgo: 25, amount: 1000 },
        { customerIdx: 0, daysAgo: 27, amount: 500 },
        // One invoice for customer 1, also in the window
        { customerIdx: 1, daysAgo: 24, amount: 700 },
      ],
    });

    const result = await upcomingReceivables(ctx, 5);

    // Two distinct customers ⇒ exactly two rows.
    expect(result).toHaveLength(2);
    const byName = Object.fromEntries(result.map((r) => [r.name, r]));
    const multi = byName['Multi Invoice Co.'];
    const single = byName['Single Invoice Inc.'];
    expect(multi).toBeDefined();
    expect(single).toBeDefined();
    // Multi customer's amount = full A/R balance (1000+500=1500), not per-invoice.
    expect(multi?.amount).toBe(1500);
    expect(single?.amount).toBe(700);
    // Multi customer's imputed due date uses the EARLIEST invoice (27 days ago + 30 = 3 days from now).
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const expectedMultiDue = new Date(today);
    expectedMultiDue.setUTCDate(expectedMultiDue.getUTCDate() + 3);
    expect(multi?.date).toBe(expectedMultiDue.toISOString().slice(0, 10));
  });
});
