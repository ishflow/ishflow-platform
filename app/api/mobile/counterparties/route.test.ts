import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedAuth = vi.hoisted(() => ({
  shouldFail: false,
  tenantId: '00000000-0000-0000-0000-000000000001',
  currency: 'USD',
}));
const mockedEngine = vi.hoisted(() => ({
  listRecordsPaged: vi.fn(),
  registerBalanceGrouped: vi.fn(),
}));

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => {
    if (mockedAuth.shouldFail) throw new Error('UNAUTHENTICATED');
    return {
      tenant: {
        id: mockedAuth.tenantId,
        name: 'Test',
        slug: 'test',
        currency: mockedAuth.currency,
      },
      user: { id: 'u1', clerkId: 'c1' },
      membership: { id: 'm1', tenantId: mockedAuth.tenantId, userId: 'u1', roles: ['admin'] },
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
    registerBalanceGrouped: mockedEngine.registerBalanceGrouped,
  };
});

// Real RLS is exercised by integration tests elsewhere. For these unit tests
// `withTenant` becomes a passthrough that just invokes its callback with a
// stub `tx` — we don't need a real DB transaction since the engine functions
// are mocked at this layer.
vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: async <T,>(_tenantId: string, fn: (tx: unknown) => Promise<T>) => fn({}),
  withBypass: async <T,>(fn: (tx: unknown) => Promise<T>) => fn({}),
}));

import { GET } from './route';

const customerA = {
  id: '11111111-1111-1111-1111-111111111111',
  code: 'C-0001',
  name: 'Customer A1',
  createdAt: new Date('2026-04-28T00:00:00Z'),
  updatedAt: new Date('2026-04-28T00:00:00Z'),
};

const customerZero = {
  id: '22222222-2222-2222-2222-222222222222',
  code: null,
  name: 'Customer A2',
  createdAt: new Date('2026-04-28T00:00:00Z'),
  updatedAt: new Date('2026-04-28T00:00:00Z'),
};

describe('GET /api/mobile/counterparties', () => {
  beforeEach(() => {
    mockedAuth.shouldFail = false;
    mockedAuth.tenantId = '00000000-0000-0000-0000-000000000001';
    mockedAuth.currency = 'USD';
    mockedEngine.listRecordsPaged.mockReset();
    mockedEngine.registerBalanceGrouped.mockReset();
  });

  it('returns customer with positive balance and balanceDirection=owesUs', async () => {
    mockedEngine.listRecordsPaged.mockResolvedValue({
      rows: [customerA],
      total: 1,
      page: 1,
      pageSize: 50,
    });
    mockedEngine.registerBalanceGrouped.mockResolvedValue([
      { customer: customerA.id, amount: 1500 },
    ]);

    const res = await GET(
      new Request('http://localhost/api/mobile/counterparties?type=customer'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe(customerA.id);
    expect(body.items[0].name).toBe('Customer A1');
    expect(body.items[0].balance).toBe('1500');
    expect(body.items[0].balanceDirection).toBe('owesUs');
    expect(body.items[0].currency).toBe('USD');
  });

  it('passes the calling tenant context through to listRecordsPaged', async () => {
    // Cross-tenant RLS itself is integration-tested elsewhere (real Postgres
    // is required to exercise the row-security policies). Here we simply
    // assert that the route hands the engine the SAME tenant context it was
    // invoked under, so the engine layer naturally scopes the query.
    mockedAuth.tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mockedEngine.listRecordsPaged.mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });

    const res = await GET(
      new Request('http://localhost/api/mobile/counterparties?type=customer&q=Customer%20B1'),
    );
    expect(res.status).toBe(200);
    expect(mockedEngine.listRecordsPaged).toHaveBeenCalledTimes(1);
    const firstCall = mockedEngine.listRecordsPaged.mock.calls[0];
    if (!firstCall) throw new Error('listRecordsPaged was not called');
    const [appArg, , optsArg] = firstCall;
    expect((appArg as { tenant: { id: string } }).tenant.id).toBe(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    );
    expect(optsArg).toMatchObject({ search: 'Customer B1', page: 1, pageSize: 50 });
    // No rows means the route doesn't even reach the balance query.
    expect(mockedEngine.registerBalanceGrouped).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });

  it('returns 400 for invalid type', async () => {
    const res = await GET(
      new Request('http://localhost/api/mobile/counterparties?type=bogus'),
    );
    expect(res.status).toBe(400);
    expect(mockedEngine.listRecordsPaged).not.toHaveBeenCalled();
  });

  it('returns 401 without tenant context', async () => {
    mockedAuth.shouldFail = true;
    const res = await GET(
      new Request('http://localhost/api/mobile/counterparties?type=customer'),
    );
    expect(res.status).toBe(401);
    expect(mockedEngine.listRecordsPaged).not.toHaveBeenCalled();
  });

  it('reports balance="0" + balanceDirection=zero when the register has no entry', async () => {
    mockedEngine.listRecordsPaged.mockResolvedValue({
      rows: [customerZero],
      total: 1,
      page: 1,
      pageSize: 50,
    });
    // Grouped query returns nothing for this customer -> zero balance.
    mockedEngine.registerBalanceGrouped.mockResolvedValue([]);

    const res = await GET(
      new Request('http://localhost/api/mobile/counterparties?type=customer&q=A2'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const a2 = body.items.find((c: { name: string }) => c.name === 'Customer A2');
    expect(a2).toBeDefined();
    expect(a2.balance).toBe('0');
    expect(a2.balanceDirection).toBe('zero');
    expect(a2.code).toBeNull();
  });

  it('binds supplier type to purchases.supplier + accounts_payable register', async () => {
    mockedEngine.listRecordsPaged.mockResolvedValue({
      rows: [
        {
          id: '33333333-3333-3333-3333-333333333333',
          code: 'S-0001',
          name: 'Acme Co',
          createdAt: new Date('2026-04-28T00:00:00Z'),
          updatedAt: new Date('2026-04-28T00:00:00Z'),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    });
    // Positive accounts_payable balance ⇒ we owe the supplier ⇒ "weOwe".
    // The inverse customer rule (positive ⇒ owesUs) is asserted earlier in
    // this file; this case guards the supplier-side sign flip.
    mockedEngine.registerBalanceGrouped.mockResolvedValue([
      { supplier: '33333333-3333-3333-3333-333333333333', amount: 250 },
    ]);

    const res = await GET(
      new Request('http://localhost/api/mobile/counterparties?type=supplier'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].balanceDirection).toBe('weOwe');
    expect(body.items[0].balance).toBe('250');

    // Verify the engine was called with the supplier register + dimension.
    const balanceCall = mockedEngine.registerBalanceGrouped.mock.calls[0];
    if (!balanceCall) throw new Error('registerBalanceGrouped was not called');
    const [, registerArg, filterArg, groupByArg] = balanceCall;
    expect((registerArg as { id: string }).id).toBe('purchases.accounts_payable');
    expect(filterArg).toEqual({
      supplier: { in: ['33333333-3333-3333-3333-333333333333'] },
    });
    expect(groupByArg).toEqual(['supplier']);
  });
});
