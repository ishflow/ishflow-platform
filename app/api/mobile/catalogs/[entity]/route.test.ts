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

import { GET } from './route';

describe('mobile catalog route — slug aliases', () => {
  beforeEach(() => {
    mockedAuth.shouldFail = false;
    mockedEngine.listRecordsPaged.mockReset();
  });

  it('rejects unknown entity', async () => {
    const res = await GET(new Request('http://t/api/mobile/catalogs/nope.nope'), {
      params: Promise.resolve({ entity: 'nope.nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated', async () => {
    mockedAuth.shouldFail = true;
    const res = await GET(
      new Request('http://t/api/mobile/catalogs/prices.priceList'),
      { params: Promise.resolve({ entity: 'prices.priceList' }) },
    );
    expect(res.status).toBe(401);
  });

  it('resolves prices.priceList alias to sales.price_type', async () => {
    mockedEngine.listRecordsPaged.mockResolvedValue({
      rows: [{
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Retail',
        createdAt: '2026-04-28T00:00:00Z',
        updatedAt: '2026-04-28T00:00:00Z',
      }],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const res = await GET(
      new Request('http://t/api/mobile/catalogs/prices.priceList'),
      { params: Promise.resolve({ entity: 'prices.priceList' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe('Retail');
  });

  it('still accepts canonical catalog IDs directly', async () => {
    mockedEngine.listRecordsPaged.mockResolvedValue({
      rows: [{
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Wholesale',
        createdAt: '2026-04-28T00:00:00Z',
        updatedAt: '2026-04-28T00:00:00Z',
      }],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const res = await GET(
      new Request('http://t/api/mobile/catalogs/sales.price_type'),
      { params: Promise.resolve({ entity: 'sales.price_type' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe('Wholesale');
  });
});
