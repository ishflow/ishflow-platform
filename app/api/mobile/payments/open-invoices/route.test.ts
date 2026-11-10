import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedAuth = vi.hoisted(() => ({
  shouldFail: false,
  tenantId: '00000000-0000-0000-0000-000000000001',
  currency: 'USD',
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

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: async <T, >(_tenantId: string, fn: (tx: unknown) => Promise<T>) => fn({}),
  withBypass: async <T, >(fn: (tx: unknown) => Promise<T>) => fn({}),
}));

import { GET } from './route';

describe('GET /api/mobile/payments/open-invoices', () => {
  beforeEach(() => {
    mockedAuth.shouldFail = false;
    mockedAuth.tenantId = '00000000-0000-0000-0000-000000000001';
    mockedAuth.currency = 'USD';
  });

  it('returns 401 without tenant context', async () => {
    mockedAuth.shouldFail = true;
    const res = await GET(
      new Request(
        'http://localhost/api/mobile/payments/open-invoices?counterpartyId=11111111-1111-1111-1111-111111111111&direction=receivable',
      ),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid query', async () => {
    const res = await GET(
      new Request(
        'http://localhost/api/mobile/payments/open-invoices?counterpartyId=not-a-uuid&direction=receivable',
      ),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid direction', async () => {
    const res = await GET(
      new Request(
        'http://localhost/api/mobile/payments/open-invoices?counterpartyId=11111111-1111-1111-1111-111111111111&direction=invalid',
      ),
    );
    expect(res.status).toBe(400);
  });
});
