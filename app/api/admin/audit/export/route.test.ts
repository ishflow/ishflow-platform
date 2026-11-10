import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => {
    throw new Error('UNAUTHENTICATED');
  },
}));

import { GET, rowsToCsv } from './route';

describe('audit CSV export', () => {
  it('returns 401 without auth', async () => {
    const res = await GET(new Request('http://localhost/api/admin/audit/export'));
    expect(res.status).toBe(401);
  });
});

describe('rowsToCsv', () => {
  it('emits a header-only file for an empty set', () => {
    const csv = rowsToCsv([], new Map());
    expect(csv).toBe('createdAt,entity,entityId,action,user');
  });

  it('emits one row per entry and resolves userId to email', () => {
    const csv = rowsToCsv(
      [
        {
          createdAt: new Date('2026-04-17T10:00:00Z'),
          entity: 'catalog.sales.customer',
          entityId: 'abc-123',
          action: 'create',
          userId: 'user-1',
        },
      ],
      new Map([['user-1', 'alice@example.com']]),
    );
    const lines = csv.split('\n');
    expect(lines[0]).toBe('createdAt,entity,entityId,action,user');
    expect(lines[1]).toBe(
      '2026-04-17T10:00:00.000Z,catalog.sales.customer,abc-123,create,alice@example.com',
    );
  });

  it('quotes fields containing commas or quotes (RFC 4180)', () => {
    const csv = rowsToCsv(
      [
        {
          createdAt: new Date('2026-04-17T10:00:00Z'),
          entity: 'catalog.x',
          entityId: 'id,with,commas',
          action: 'update',
          userId: null,
        },
      ],
      new Map(),
    );
    expect(csv).toContain('"id,with,commas"');
  });
});
