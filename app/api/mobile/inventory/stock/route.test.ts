import { beforeEach, describe, expect, it, vi } from 'vitest';

const tenantId = '00000000-0000-0000-0000-000000000001';

const mockedAuth = vi.hoisted(() => ({
  shouldFail: false,
}));
const mockedEngine = vi.hoisted(() => ({
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
    registerBalanceGrouped: mockedEngine.registerBalanceGrouped,
  };
});

import { GET } from './route';

function fakeWarehouseTx(warehouses: Record<string, { id: string; name: string }>) {
  return {
    catalog_inventory_warehouse: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => warehouses[id]).filter(Boolean),
      ),
    },
  };
}

describe('GET /api/mobile/inventory/stock', () => {
  beforeEach(() => {
    mockedAuth.shouldFail = false;
    mockedEngine.registerBalanceGrouped.mockReset();
    mockedTenantContext.txByTenant.clear();
  });

  it('returns per-warehouse stock for products with stock', async () => {
    mockedTenantContext.txByTenant.set(
      tenantId,
      fakeWarehouseTx({
        WH1: { id: 'WH1', name: 'Merkez' },
        WH2: { id: 'WH2', name: 'Şube1' },
      }),
    );
    mockedEngine.registerBalanceGrouped.mockResolvedValue([
      { product: 'PROD_A', warehouse: 'WH1', quantity: 12 },
      { product: 'PROD_A', warehouse: 'WH2', quantity: 5 },
    ]);

    const req = new Request('http://test/api/mobile/inventory/stock?productIds=PROD_A');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].productId).toBe('PROD_A');
    expect(body.items[0].byWarehouse).toEqual([
      { warehouseId: 'WH1', warehouseName: 'Merkez', qty: '12' },
      { warehouseId: 'WH2', warehouseName: 'Şube1', qty: '5' },
    ]);
  });

  it('returns empty byWarehouse for product with no stock', async () => {
    mockedTenantContext.txByTenant.set(tenantId, fakeWarehouseTx({}));
    mockedEngine.registerBalanceGrouped.mockResolvedValue([]);

    const req = new Request('http://test/api/mobile/inventory/stock?productIds=PROD_B');
    const res = await GET(req);
    const body = await res.json();
    expect(body.items[0].byWarehouse).toEqual([]);
  });

  it('rejects requests with more than 100 productIds (400)', async () => {
    const ids = Array.from(
      { length: 101 },
      (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
    ).join(',');
    const req = new Request(`http://test/api/mobile/inventory/stock?productIds=${ids}`);
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when productIds is missing', async () => {
    const req = new Request('http://test/api/mobile/inventory/stock');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('does not leak cross-tenant products', async () => {
    mockedTenantContext.txByTenant.set(tenantId, fakeWarehouseTx({}));
    mockedEngine.registerBalanceGrouped.mockResolvedValue([]);

    const req = new Request('http://test/api/mobile/inventory/stock?productIds=OTHER_TENANT_PROD');
    const res = await GET(req);
    const body = await res.json();
    expect(body.items[0].byWarehouse).toEqual([]);
  });
});
