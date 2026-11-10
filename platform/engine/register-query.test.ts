import { randomUUID } from 'node:crypto';
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { clearRegistry, defineAccumulationRegister, field, getRegistry } from '@/platform/metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  balanceAsOf,
  listMovementsPaged,
  registerBalance,
  registerBalanceAll,
  registerBalanceGrouped,
  turnover,
} from './register-query';

const tenantA = randomUUID();
const tenantB = randomUUID();
const registerCfg = getRegistry().register['inventory.stock_balance'];
if (!registerCfg) throw new Error('stock_balance not registered');

const productA1 = randomUUID();
const productA2 = randomUUID();
const productB1 = randomUUID();
const productC = randomUUID();
const warehouseA = randomUUID();
const warehouseB = randomUUID();
const t1 = new Date('2026-01-10T00:00:00Z');
const t2 = new Date('2026-02-10T00:00:00Z');
const t3 = new Date('2026-03-10T00:00:00Z');

beforeAll(async () => {
  await withBypass(async (tx) => {
    for (const t of [tenantA, tenantB]) {
      await tx.tenant.create({
        data: {
          id: t,
          clerkOrgId: `org_${t}`,
          name: `register-test-${t.slice(0, 6)}`,
          slug: `rt-${t.slice(0, 8)}`,
        },
      });
    }
  });
  await withTenant(tenantA, (tx) =>
    tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      warehouseA,
      tenantA,
      `WH-${tenantA.slice(0, 6)}`,
      'Register test WH A',
    ),
  );
  await withTenant(tenantB, (tx) =>
    tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      warehouseB,
      tenantB,
      `WH-${tenantB.slice(0, 6)}`,
      'Register test WH B',
    ),
  );
  // tenantA: product A1 income 10 + expense 3 (net 7), product A2 income 5.
  // tenantB: product B1 income 99 (must be invisible to tenantA).
  const now = new Date();
  await withTenant(tenantA, async (tx) => {
    const bag = tx as unknown as {
      movement_inventory_stock_balance: { create: (args: unknown) => Promise<unknown> };
    };
    await bag.movement_inventory_stock_balance.create({
      data: {
        tenantId: tenantA,
        docRef: randomUUID(),
        docType: 'test',
        warehouse: warehouseA,
        kind: 'income',
        active: true,
        timestamp: now,
        product: productA1,
        quantity: 10,
        totalCost: 0,
      },
    });
    await bag.movement_inventory_stock_balance.create({
      data: {
        tenantId: tenantA,
        docRef: randomUUID(),
        docType: 'test',
        warehouse: warehouseA,
        kind: 'expense',
        active: true,
        timestamp: now,
        product: productA1,
        quantity: 3,
        totalCost: 0,
      },
    });
    await bag.movement_inventory_stock_balance.create({
      data: {
        tenantId: tenantA,
        docRef: randomUUID(),
        docType: 'test',
        warehouse: warehouseA,
        kind: 'income',
        active: true,
        timestamp: now,
        product: productA2,
        quantity: 5,
        totalCost: 0,
      },
    });
  });
  await withTenant(tenantB, async (tx) => {
    const bag = tx as unknown as {
      movement_inventory_stock_balance: { create: (args: unknown) => Promise<unknown> };
    };
    await bag.movement_inventory_stock_balance.create({
      data: {
        tenantId: tenantB,
        docRef: randomUUID(),
        docType: 'test',
        warehouse: warehouseB,
        kind: 'income',
        active: true,
        timestamp: now,
        product: productB1,
        quantity: 99,
        totalCost: 0,
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_inventory_stock_balance WHERE tenant_id IN ($1::uuid, $2::uuid)',
      tenantA,
      tenantB,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_warehouse WHERE tenant_id IN ($1::uuid, $2::uuid)',
      tenantA,
      tenantB,
    );
    await tx.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  });
});

describe('registerBalanceGrouped', () => {
  it('sums the primary resource grouped by dimension and applies sign from kind', async () => {
    const rows = await withTenant(tenantA, (tx) =>
      registerBalanceGrouped(tx, registerCfg, {}, ['product']),
    );
    const byProduct = new Map(rows.map((r) => [r.product as string, r.quantity as number]));
    expect(byProduct.get(productA1)).toBe(7); // 10 - 3
    expect(byProduct.get(productA2)).toBe(5);
    expect(byProduct.size).toBe(2);
  });

  it('respects RLS — tenantA cannot see tenantB movements', async () => {
    const rows = await withTenant(tenantA, (tx) =>
      registerBalanceGrouped(tx, registerCfg, {}, ['product']),
    );
    const byProduct = new Map(rows.map((r) => [r.product as string, r.quantity as number]));
    expect(byProduct.has(productB1)).toBe(false);
  });

  it('filters by arbitrary dimension predicate', async () => {
    const rows = await withTenant(tenantA, (tx) =>
      registerBalanceGrouped(tx, registerCfg, { product: productA1 }, ['product']),
    );
    const [first] = rows;
    expect(first).toBeDefined();
    expect(first?.quantity).toBe(7);
  });
});

describe('listMovementsPaged', () => {
  it('paginates active movements ordered by timestamp desc', async () => {
    const result = await withTenant(tenantA, (tx) =>
      listMovementsPaged(tx, registerCfg, { page: 1, pageSize: 10 }),
    );
    expect(result.total).toBe(3);
    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((r) => r.active === true)).toBe(true);
  });

  it('applies a dimension filter in the where clause', async () => {
    const result = await withTenant(tenantA, (tx) =>
      listMovementsPaged(tx, registerCfg, {
        page: 1,
        pageSize: 10,
        filter: { product: productA1 },
      }),
    );
    expect(result.total).toBe(2);
    expect(result.rows.every((r) => r.product === productA1)).toBe(true);
  });

  it('respects RLS across tenants', async () => {
    const resA = await withTenant(tenantA, (tx) =>
      listMovementsPaged(tx, registerCfg, { page: 1, pageSize: 100 }),
    );
    const resB = await withTenant(tenantB, (tx) =>
      listMovementsPaged(tx, registerCfg, { page: 1, pageSize: 100 }),
    );
    expect(resA.rows.every((r) => r.tenantId === tenantA)).toBe(true);
    expect(resB.rows.every((r) => r.tenantId === tenantB)).toBe(true);
    expect(resA.total + resB.total).toBe(4);
  });

  it('respects page + pageSize', async () => {
    const page1 = await withTenant(tenantA, (tx) =>
      listMovementsPaged(tx, registerCfg, { page: 1, pageSize: 2 }),
    );
    const page2 = await withTenant(tenantA, (tx) =>
      listMovementsPaged(tx, registerCfg, { page: 2, pageSize: 2 }),
    );
    expect(page1.rows).toHaveLength(2);
    expect(page2.rows).toHaveLength(1);
    expect(page1.total).toBe(3);
  });
});

describe('balanceAsOf', () => {
  // Inserts productC dated fixtures; turnover describe reuses the same rows.
  beforeAll(async () => {
    await withTenant(tenantA, async (tx) => {
      const bag = tx as unknown as {
        movement_inventory_stock_balance: { create: (args: unknown) => Promise<unknown> };
      };
      await bag.movement_inventory_stock_balance.create({
        data: {
          tenantId: tenantA,
          docRef: randomUUID(),
          docType: 'test',
          warehouse: warehouseA,
          kind: 'income',
          active: true,
          timestamp: t1,
          product: productC,
          quantity: 100,
          totalCost: 0,
        },
      });
      await bag.movement_inventory_stock_balance.create({
        data: {
          tenantId: tenantA,
          docRef: randomUUID(),
          docType: 'test',
          warehouse: warehouseA,
          kind: 'expense',
          active: true,
          timestamp: t2,
          product: productC,
          quantity: 40,
          totalCost: 0,
        },
      });
      await bag.movement_inventory_stock_balance.create({
        data: {
          tenantId: tenantA,
          docRef: randomUUID(),
          docType: 'test',
          warehouse: warehouseA,
          kind: 'income',
          active: true,
          timestamp: t3,
          product: productC,
          quantity: 25,
          totalCost: 0,
        },
      });
    });
  });

  it('sums signed movements up to and including asOf', async () => {
    const before = await withTenant(tenantA, (tx) =>
      balanceAsOf(tx, registerCfg, { product: productC }, new Date('2026-01-01T00:00:00Z')),
    );
    expect(before.quantity).toBe(0);

    const midA = await withTenant(tenantA, (tx) =>
      balanceAsOf(tx, registerCfg, { product: productC }, t1),
    );
    expect(midA.quantity).toBe(100);

    const midB = await withTenant(tenantA, (tx) =>
      balanceAsOf(tx, registerCfg, { product: productC }, t2),
    );
    expect(midB.quantity).toBe(60);

    const full = await withTenant(tenantA, (tx) =>
      balanceAsOf(tx, registerCfg, { product: productC }, new Date('2099-01-01T00:00:00Z')),
    );
    expect(full.quantity).toBe(85);
  });

  it('strips caller-supplied timestamp filter', async () => {
    const result = await withTenant(tenantA, (tx) =>
      balanceAsOf(
        tx,
        registerCfg,
        { product: productC, timestamp: { gte: t3 } as unknown } as Record<string, unknown>,
        t3,
      ),
    );
    expect(result.quantity).toBe(85);
  });

  it('respects RLS across tenants', async () => {
    const resA = await withTenant(tenantA, (tx) =>
      balanceAsOf(tx, registerCfg, {}, new Date('2099-01-01T00:00:00Z')),
    );
    const resB = await withTenant(tenantB, (tx) =>
      balanceAsOf(tx, registerCfg, {}, new Date('2099-01-01T00:00:00Z')),
    );
    expect(resA.quantity).toBe(7 + 5 + 85);
    expect(resB.quantity).toBe(99);
  });
});

describe('registerBalanceAll', () => {
  beforeEach(() => {
    // Clear any test-registered configs before each unit test.
    // The existing integration tests captured registerCfg at module-load time,
    // so they are unaffected by registry mutations mid-run.
    clearRegistry();
  });

  it('returns every resource keyed by resource name', async () => {
    defineAccumulationRegister({
      module: 'test',
      name: 'multi',
      label: { en: 'Multi', ru: 'Мульти', tr: 'Multi' },
      dimensions: {
        bucket: field.reference({
          label: { en: 'B', ru: 'Б', tr: 'B' },
          required: true,
          to: { kind: 'ref', module: 'test', name: 'bucket' },
        }),
      },
      resources: {
        qty: field.number({ label: { en: 'Qty', ru: 'Кол-во', tr: 'Miktar' }, required: true }),
        sum: field.money({ label: { en: 'Sum', ru: 'Сумма', tr: 'Tutar' }, required: true }),
      },
    });
    const register = getRegistry().register['test.multi'];
    expect(register).toBeDefined();
    if (!register) return;

    const fakeTx = {
      movement_test_multi: {
        findMany: async () => [
          { kind: 'income', qty: 10, sum: 1000 },
          { kind: 'income', qty: 5, sum: 450 },
          { kind: 'expense', qty: 3, sum: 295 },
        ],
        count: async () => 0,
        groupBy: async () => [],
      },
    };

    const all = await registerBalanceAll(fakeTx, register, { bucket: 'a' });
    expect(all.qty).toBe(12);
    expect(all.sum).toBe(1155);
  });

  it('registerBalance remains { quantity: number } wrapper for backcompat', async () => {
    defineAccumulationRegister({
      module: 'test',
      name: 'single',
      label: { en: 'Single', ru: 'Один', tr: 'Tek' },
      dimensions: {
        bucket: field.reference({
          label: { en: 'B', ru: 'Б', tr: 'B' },
          required: true,
          to: { kind: 'ref', module: 'test', name: 'bucket' },
        }),
      },
      resources: {
        quantity: field.number({
          label: { en: 'Qty', ru: 'Кол-во', tr: 'Miktar' },
          required: true,
        }),
      },
    });
    const register = getRegistry().register['test.single'];
    expect(register).toBeDefined();
    if (!register) return;
    const fakeTx = {
      movement_test_single: {
        findMany: async () => [
          { kind: 'income', quantity: 7 },
          { kind: 'expense', quantity: 2 },
        ],
        count: async () => 0,
        groupBy: async () => [],
      },
    };
    const r = await registerBalance(fakeTx, register, { bucket: 'a' });
    expect(r.quantity).toBe(5);
  });
});

describe('turnover', () => {
  it('computes opening / income / expense / closing grouped by dimension', async () => {
    const rows = await withTenant(tenantA, (tx) =>
      turnover(
        tx,
        registerCfg,
        { product: productC },
        {
          from: new Date('2026-02-01T00:00:00Z'),
          to: new Date('2026-03-31T23:59:59Z'),
          groupBy: ['product'],
        },
      ),
    );
    expect(rows).toHaveLength(1);
    const row = rows[0] as Record<string, unknown>;
    expect(row.product).toBe(productC);
    expect(row.opening).toBe(100); // only t1 is before 2026-02-01
    expect(row.income).toBe(25); // t3 inside period
    expect(row.expense).toBe(40); // t2 inside period
    expect(row.closing).toBe(85); // 100 + 25 - 40
  });

  it('empty groupBy returns a single aggregate row', async () => {
    const rows = await withTenant(tenantA, (tx) =>
      turnover(
        tx,
        registerCfg,
        { product: productC },
        {
          from: new Date('2026-02-01T00:00:00Z'),
          to: new Date('2026-03-31T23:59:59Z'),
          groupBy: [],
        },
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.opening).toBe(100);
    expect(rows[0]?.income).toBe(25);
    expect(rows[0]?.expense).toBe(40);
    expect(rows[0]?.closing).toBe(85);
  });

  it('zeros out when the period has no movements', async () => {
    const rows = await withTenant(tenantA, (tx) =>
      turnover(
        tx,
        registerCfg,
        { product: productC },
        {
          from: new Date('2027-01-01T00:00:00Z'),
          to: new Date('2027-12-31T00:00:00Z'),
          groupBy: ['product'],
        },
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.opening).toBe(85);
    expect(rows[0]?.income).toBe(0);
    expect(rows[0]?.expense).toBe(0);
    expect(rows[0]?.closing).toBe(85);
  });

  it('respects RLS across tenants', async () => {
    const rowsA = await withTenant(tenantA, (tx) =>
      turnover(
        tx,
        registerCfg,
        {},
        {
          from: new Date('2000-01-01T00:00:00Z'),
          to: new Date('2099-01-01T00:00:00Z'),
          groupBy: ['product'],
        },
      ),
    );
    const rowsB = await withTenant(tenantB, (tx) =>
      turnover(
        tx,
        registerCfg,
        {},
        {
          from: new Date('2000-01-01T00:00:00Z'),
          to: new Date('2099-01-01T00:00:00Z'),
          groupBy: ['product'],
        },
      ),
    );
    const productsA = rowsA.map((r) => r.product);
    const productsB = rowsB.map((r) => r.product);
    expect(productsA).not.toContain(productB1);
    expect(productsB).toContain(productB1);
    expect(productsB).not.toContain(productC);
  });

  it('throws when groupBy references an unknown dimension', async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        turnover(
          tx,
          registerCfg,
          {},
          {
            from: new Date('2000-01-01T00:00:00Z'),
            to: new Date('2099-01-01T00:00:00Z'),
            groupBy: ['not_a_dim'],
          },
        ),
      ),
    ).rejects.toThrow(/not a dimension/);
  });
});
