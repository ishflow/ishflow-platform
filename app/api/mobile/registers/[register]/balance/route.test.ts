import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tenantId = '00000000-0000-0000-0000-000000000001';

const mockedAuth = vi.hoisted(() => ({
  shouldFail: false,
}));
const mockedEngine = vi.hoisted(() => ({
  registerBalanceAll: vi.fn(),
  balanceAsOf: vi.fn(),
  registerBalanceGrouped: vi.fn(),
}));
const mockedTenantContext = vi.hoisted(() => ({
  txByTenant: new Map<string, unknown>(),
}));

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => {
    if (mockedAuth.shouldFail) throw new Error('UNAUTHENTICATED');
    return {
      tenant: { id: tenantId, name: 'Test', slug: 'test' },
      user: { id: 'u1', clerkId: 'c1' },
      membership: { id: 'm1', tenantId, userId: 'u1', roles: ['admin'] },
      permissions: new Set<string>(['*:*']),
      scopesByEntity: new Map(),
    };
  },
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: async <T,>(tid: string, fn: (tx: unknown) => Promise<T>) => {
    const tx = mockedTenantContext.txByTenant.get(tid);
    return fn(tx);
  },
}));

vi.mock('@/platform/engine', async () => {
  const actual = await vi.importActual<typeof import('@/platform/engine')>('@/platform/engine');
  return {
    ...actual,
    registerBalanceAll: mockedEngine.registerBalanceAll,
    balanceAsOf: mockedEngine.balanceAsOf,
    registerBalanceGrouped: mockedEngine.registerBalanceGrouped,
  };
});

import { GET } from './route';

function fakeProductTx(records: Record<string, { id: string; name: string }>) {
  return {
    catalog_inventory_product: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => records[id]).filter(Boolean),
      ),
    },
    catalog_inventory_warehouse: {
      findMany: vi.fn(async () => []),
    },
  };
}

function fakeProductWarehouseTx(
  products: Record<string, { id: string; name: string }>,
  warehouses: Record<string, { id: string; name: string }>,
) {
  return {
    catalog_inventory_product: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => products[id]).filter(Boolean),
      ),
    },
    catalog_inventory_warehouse: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => warehouses[id]).filter(Boolean),
      ),
    },
  };
}

describe('mobile register balance route — groupLabels', () => {
  beforeEach(() => {
    mockedAuth.shouldFail = false;
    mockedEngine.registerBalanceAll.mockReset();
    mockedEngine.balanceAsOf.mockReset();
    mockedEngine.registerBalanceGrouped.mockReset();
    mockedTenantContext.txByTenant.clear();
  });
  afterEach(() => {
    mockedTenantContext.txByTenant.clear();
  });

  it('rejects unknown register', async () => {
    const res = await GET(new Request('http://t/api/mobile/registers/nope.nope/balance'), {
      params: Promise.resolve({ register: 'nope.nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated', async () => {
    mockedAuth.shouldFail = true;
    const res = await GET(
      new Request('http://t/api/mobile/registers/inventory.stock_balance/balance'),
      { params: Promise.resolve({ register: 'inventory.stock_balance' }) },
    );
    expect(res.status).toBe(401);
  });

  it('emits groupLabels for ref-typed dimensions', async () => {
    mockedTenantContext.txByTenant.set(
      tenantId,
      fakeProductTx({ 'p-1': { id: 'p-1', name: 'Apple Bread' } }),
    );
    mockedEngine.registerBalanceAll.mockResolvedValue({ quantity: 12, totalCost: 50 });

    const res = await GET(
      new Request('http://t/api/mobile/registers/inventory.stock_balance/balance?product=p-1'),
      { params: Promise.resolve({ register: 'inventory.stock_balance' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].groupKey).toEqual({ product: 'p-1' });
    expect(body.rows[0].groupLabels).toEqual({ product: 'Apple Bread' });
    expect(body.rows[0].quantity).toBe('12');
  });

  it('omits groupLabels when no ref lookup yields a value', async () => {
    mockedTenantContext.txByTenant.set(tenantId, fakeProductTx({}));
    mockedEngine.registerBalanceAll.mockResolvedValue({ quantity: 0 });

    const res = await GET(
      new Request(
        'http://t/api/mobile/registers/inventory.stock_balance/balance?product=p-deleted',
      ),
      { params: Promise.resolve({ register: 'inventory.stock_balance' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows[0].groupKey).toEqual({ product: 'p-deleted' });
    expect(body.rows[0].groupLabels).toBeUndefined();
  });

  it('omits groupLabels when no filter is supplied', async () => {
    mockedTenantContext.txByTenant.set(tenantId, fakeProductTx({}));
    mockedEngine.registerBalanceAll.mockResolvedValue({ quantity: 0 });

    const res = await GET(
      new Request('http://t/api/mobile/registers/inventory.stock_balance/balance'),
      { params: Promise.resolve({ register: 'inventory.stock_balance' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows[0].groupKey).toEqual({});
    expect(body.rows[0].groupLabels).toBeUndefined();
  });

  it('returns per-dimension rows with resolved groupLabels when groupBy is passed', async () => {
    mockedTenantContext.txByTenant.set(
      tenantId,
      fakeProductWarehouseTx(
        {
          'p-1': { id: 'p-1', name: 'Apple Bread' },
          'p-2': { id: 'p-2', name: 'Banana Bread' },
        },
        { 'w-1': { id: 'w-1', name: 'Main Warehouse' } },
      ),
    );
    mockedEngine.registerBalanceGrouped.mockResolvedValue([
      { warehouse: 'w-1', product: 'p-1', quantity: 10 },
      { warehouse: 'w-1', product: 'p-2', quantity: 15 },
    ]);

    const res = await GET(
      new Request(
        'http://t/api/mobile/registers/inventory.stock_balance/balance?groupBy=warehouse,product',
      ),
      { params: Promise.resolve({ register: 'inventory.stock_balance' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(2);
    expect(body.rows[0].groupKey).toEqual({ warehouse: 'w-1', product: 'p-1' });
    expect(body.rows[0].quantity).toBe('10');
    expect(body.rows[0].groupLabels).toEqual({
      warehouse: 'Main Warehouse',
      product: 'Apple Bread',
    });
    expect(body.rows[1].groupKey).toEqual({ warehouse: 'w-1', product: 'p-2' });
    expect(body.rows[1].quantity).toBe('15');
    expect(body.rows[1].groupLabels?.product).toBe('Banana Bread');
  });

  it('rejects groupBy with unknown dimension', async () => {
    const res = await GET(
      new Request(
        'http://t/api/mobile/registers/inventory.stock_balance/balance?groupBy=warehouse,nope',
      ),
      { params: Promise.resolve({ register: 'inventory.stock_balance' }) },
    );
    expect(res.status).toBe(400);
  });

  it('honors asOf and still emits groupLabels', async () => {
    mockedTenantContext.txByTenant.set(
      tenantId,
      fakeProductTx({ 'p-1': { id: 'p-1', name: 'Apple Bread' } }),
    );
    mockedEngine.balanceAsOf.mockResolvedValue({ quantity: 7 });

    const res = await GET(
      new Request(
        'http://t/api/mobile/registers/inventory.stock_balance/balance?asOf=2026-04-27&product=p-1',
      ),
      { params: Promise.resolve({ register: 'inventory.stock_balance' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows[0].groupLabels).toEqual({ product: 'Apple Bread' });
    expect(body.rows[0].quantity).toBe('7');
    expect(body.asOf).toMatch(/^2026-04-27T/);
  });
});

describe('mobile register balance route — slug aliases', () => {
  beforeEach(() => {
    mockedAuth.shouldFail = false;
    mockedEngine.registerBalanceAll.mockReset();
    mockedEngine.balanceAsOf.mockReset();
    mockedEngine.registerBalanceGrouped.mockReset();
    mockedTenantContext.txByTenant.clear();
    mockedTenantContext.txByTenant.set(tenantId, fakeProductTx({}));
  });
  afterEach(() => {
    mockedTenantContext.txByTenant.clear();
  });

  it('resolves ar.receivable alias to sales.accounts_receivable', async () => {
    mockedEngine.registerBalanceAll.mockResolvedValue({ quantity: 100 });

    const res = await GET(new Request('http://t/api/mobile/registers/ar.receivable/balance'), {
      params: Promise.resolve({ register: 'ar.receivable' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.register).toBe('sales.accounts_receivable');
    expect(body.rows[0].quantity).toBe('100');
  });

  it('resolves inventory.stock alias to inventory.stock_balance', async () => {
    mockedEngine.registerBalanceAll.mockResolvedValue({ quantity: 42 });

    const res = await GET(new Request('http://t/api/mobile/registers/inventory.stock/balance'), {
      params: Promise.resolve({ register: 'inventory.stock' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.register).toBe('inventory.stock_balance');
    expect(body.rows[0].quantity).toBe('42');
  });

  it('resolves ap.payable alias to purchases.accounts_payable', async () => {
    mockedEngine.registerBalanceAll.mockResolvedValue({ quantity: 200 });

    const res = await GET(new Request('http://t/api/mobile/registers/ap.payable/balance'), {
      params: Promise.resolve({ register: 'ap.payable' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.register).toBe('purchases.accounts_payable');
    expect(body.rows[0].quantity).toBe('200');
  });

  it('still accepts canonical register IDs directly', async () => {
    mockedEngine.registerBalanceAll.mockResolvedValue({ quantity: 50 });

    const res = await GET(
      new Request('http://t/api/mobile/registers/sales.accounts_receivable/balance'),
      { params: Promise.resolve({ register: 'sales.accounts_receivable' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.register).toBe('sales.accounts_receivable');
    expect(body.rows[0].quantity).toBe('50');
  });
});
