import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedAuth = vi.hoisted(() => ({
  shouldFail: false,
}));
const mockedEngine = vi.hoisted(() => ({
  listRecordsPaged: vi.fn(),
}));

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => {
    if (mockedAuth.shouldFail) throw new Error('UNAUTHENTICATED');
    return {
      tenant: { id: 't1', name: 'Test', slug: 'test' },
      user: { id: 'u1', clerkId: 'c1' },
      membership: { id: 'm1', tenantId: 't1', userId: 'u1', roles: ['admin'] },
      permissions: new Set<string>(['*:*']),
      scopesByEntity: new Map(),
    };
  },
}));

vi.mock('@/platform/engine', async () => {
  const actual = await vi.importActual<typeof import('@/platform/engine')>('@/platform/engine');
  return {
    ...actual,
    listRecordsPaged: mockedEngine.listRecordsPaged,
  };
});

const mockedTenantContext = vi.hoisted(() => ({
  txByTenant: new Map<string, unknown>(),
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: async <T,>(tid: string, fn: (tx: unknown) => Promise<T>) => {
    const tx = mockedTenantContext.txByTenant.get(tid);
    return fn(tx);
  },
  withBypass: async <T,>(fn: (tx: unknown) => Promise<T>) => fn({}),
}));

import { GET } from './[entity]/route';

const tenantId = 't1';

function fakePriceTypeTx(priceTypes: Record<string, { id: string; name: string }>) {
  return {
    catalog_sales_price_type: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => priceTypes[id]).filter(Boolean),
      ),
    },
  };
}

describe('GET /api/mobile/catalogs/sales.customer — defaultPriceType', () => {
  beforeEach(() => {
    mockedAuth.shouldFail = false;
    mockedEngine.listRecordsPaged.mockReset();
    mockedTenantContext.txByTenant.clear();
    mockedTenantContext.txByTenant.set(
      tenantId,
      fakePriceTypeTx({
        '550e8400-e29b-41d4-a716-446655440001': { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Wholesale' },
      }),
    );
  });

  it('exposes resolved defaultPriceType for customers that have one', async () => {
    mockedEngine.listRecordsPaged.mockResolvedValue({
      rows: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Acme',
          defaultPriceTypeId: '550e8400-e29b-41d4-a716-446655440001',
          createdAt: '2026-04-28T00:00:00Z',
          updatedAt: '2026-04-28T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const req = new Request('http://test/api/mobile/catalogs/sales.customer');
    const res = await GET(req, { params: Promise.resolve({ entity: 'sales.customer' }) });
    const body = await res.json();
    const acme = body.items.find((i: { name: string }) => i.name === 'Acme');
    expect(acme.defaultPriceType).toEqual({ id: '550e8400-e29b-41d4-a716-446655440001', name: 'Wholesale' });
  });

  it('returns null defaultPriceType for customers without one', async () => {
    mockedEngine.listRecordsPaged.mockResolvedValue({
      rows: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Bob',
          defaultPriceTypeId: null,
          createdAt: '2026-04-28T00:00:00Z',
          updatedAt: '2026-04-28T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const req = new Request('http://test/api/mobile/catalogs/sales.customer');
    const res = await GET(req, { params: Promise.resolve({ entity: 'sales.customer' }) });
    const body = await res.json();
    const bob = body.items.find((i: { name: string }) => i.name === 'Bob');
    expect(bob.defaultPriceType).toBeNull();
  });

  it('does not add defaultPriceType to non-customer catalogs', async () => {
    mockedEngine.listRecordsPaged.mockResolvedValue({
      rows: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Retail',
          createdAt: '2026-04-28T00:00:00Z',
          updatedAt: '2026-04-28T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const req = new Request('http://test/api/mobile/catalogs/sales.price_type');
    const res = await GET(req, { params: Promise.resolve({ entity: 'sales.price_type' }) });
    const body = await res.json();
    expect(body.items[0]?.defaultPriceType).toBeUndefined();
  });
});
