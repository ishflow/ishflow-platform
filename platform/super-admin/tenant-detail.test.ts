import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithBypass = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

import {
  getTenantActivity,
  getTenantDebug,
  getTenantDocuments,
  getTenantOverview,
  getTenantUsers,
} from './tenant-detail';

interface MockTx {
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  membership: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  auditLog: { findMany: ReturnType<typeof vi.fn> };
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
}

function buildTx(overrides: Partial<MockTx> = {}): MockTx {
  return {
    tenant: { findUnique: vi.fn() },
    membership: { count: vi.fn(), findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    ...overrides,
  };
}

function installTx(tx: MockTx): void {
  mockWithBypass.mockImplementation(async (fn: (tx: MockTx) => Promise<unknown>) => fn(tx));
}

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

beforeEach(() => {
  mockWithBypass.mockReset();
});

describe('getTenantOverview', () => {
  it('returns null when the tenant is not found', async () => {
    const tx = buildTx();
    tx.tenant.findUnique.mockResolvedValue(null);
    installTx(tx);

    const result = await getTenantOverview(TENANT_ID);
    expect(result).toBeNull();
  });

  it('returns tenant, ownerCount, totalDocs and mrrUsd for an active tenant', async () => {
    const tenant = {
      id: TENANT_ID,
      plan: 'pro',
      status: 'active',
      currency: 'USD',
      name: 'Acme',
    };
    const tx = buildTx();
    tx.tenant.findUnique.mockResolvedValue(tenant);
    tx.membership.count.mockResolvedValue(2);
    // 4 doc tables → return 1, 2, 3, 4 counts.
    tx.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([{ count: 2n }])
      .mockResolvedValueOnce([{ count: 3n }])
      .mockResolvedValueOnce([{ count: 4n }]);
    installTx(tx);

    const result = await getTenantOverview(TENANT_ID);

    expect(result).not.toBeNull();
    expect(result?.tenant.id).toBe(TENANT_ID);
    expect(result?.ownerCount).toBe(2);
    expect(result?.totalDocs).toBe(10);
    expect(result?.mrrUsd).toBe(49); // pro USD
  });

  it('returns 0 MRR when status is trialing', async () => {
    const tenant = {
      id: TENANT_ID,
      plan: 'pro',
      status: 'trialing',
      currency: 'USD',
      name: 'Acme',
    };
    const tx = buildTx();
    tx.tenant.findUnique.mockResolvedValue(tenant);
    tx.membership.count.mockResolvedValue(1);
    tx.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: 0n }])
      .mockResolvedValueOnce([{ count: 0n }])
      .mockResolvedValueOnce([{ count: 0n }])
      .mockResolvedValueOnce([{ count: 0n }]);
    installTx(tx);

    const result = await getTenantOverview(TENANT_ID);
    expect(result?.mrrUsd).toBe(0);
  });
});

describe('getTenantUsers', () => {
  it('flattens memberships, users, and roles into a single row shape', async () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const tx = buildTx();
    tx.membership.findMany.mockResolvedValue([
      {
        id: 'm1',
        createdAt: now,
        user: {
          id: 'u1',
          email: 'one@example.com',
          firstName: 'A',
          lastName: 'B',
        },
        roles: [{ name: 'owner' }, { name: 'manager' }],
      },
    ]);
    installTx(tx);

    const result = await getTenantUsers(TENANT_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      membershipId: 'm1',
      userId: 'u1',
      email: 'one@example.com',
      firstName: 'A',
      lastName: 'B',
      roles: ['owner', 'manager'],
      joinedAt: now,
    });
  });
});

describe('getTenantDocuments', () => {
  it('returns an empty result when every doc table is empty', async () => {
    const tx = buildTx();
    tx.$queryRawUnsafe.mockResolvedValue([]);
    installTx(tx);

    const result = await getTenantDocuments(TENANT_ID, { limit: 10 });
    expect(result.rows).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it('merges rows from invoice and payment tables, sorts by createdAt desc', async () => {
    const old = new Date('2026-04-01T00:00:00Z');
    const newer = new Date('2026-05-01T00:00:00Z');
    const tx = buildTx();
    // sales_invoice (lines table) — newer row
    tx.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (sql.includes('document_sales_invoice') && sql.includes('SUM')) {
        return [
          {
            id: 'si-1',
            number: 'SI-001',
            date: newer,
            status: 'POSTED',
            created_at: newer,
            total: '100',
          },
        ];
      }
      if (sql.includes('document_purchases_invoice') && sql.includes('SUM')) {
        return [];
      }
      if (sql.includes('document_sales_payment_received')) {
        return [
          {
            id: 'sp-1',
            number: 'SP-001',
            date: old,
            status: 'POSTED',
            created_at: old,
            amount: '50',
          },
        ];
      }
      return [];
    });
    installTx(tx);

    const result = await getTenantDocuments(TENANT_ID, { limit: 10 });
    expect(result.rows.map((r) => r.id)).toEqual(['si-1', 'sp-1']);
    expect(result.rows[0]?.total).toBe(100);
    expect(result.rows[1]?.total).toBe(50);
  });

  it('filters by type when provided', async () => {
    const tx = buildTx();
    tx.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (sql.includes('document_sales_invoice')) {
        return [
          {
            id: 'si-only',
            number: 'SI-001',
            date: new Date('2026-05-01'),
            status: 'POSTED',
            created_at: new Date('2026-05-01'),
            total: '100',
          },
        ];
      }
      return [];
    });
    installTx(tx);

    const result = await getTenantDocuments(TENANT_ID, { type: 'sales_invoice' });
    // Should only have hit the sales_invoice table.
    expect(tx.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.type).toBe('sales_invoice');
  });
});

describe('getTenantActivity', () => {
  it('returns mapped rows with userEmail joined from the related user', async () => {
    const createdAt = new Date('2026-05-10T00:00:00Z');
    const tx = buildTx();
    tx.auditLog.findMany.mockResolvedValue([
      {
        id: 'a1',
        userId: 'u1',
        entity: 'sales.invoice',
        entityId: 'inv-1',
        action: 'create',
        before: null,
        after: { number: 'SI-001' },
        createdAt,
        user: { email: 'actor@example.com' },
      },
    ]);
    installTx(tx);

    const result = await getTenantActivity(TENANT_ID, { limit: 50 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      id: 'a1',
      userId: 'u1',
      userEmail: 'actor@example.com',
      entity: 'sales.invoice',
      entityId: 'inv-1',
      action: 'create',
      before: null,
      after: { number: 'SI-001' },
      createdAt,
    });
    expect(result.nextCursor).toBeNull();
  });

  it('emits a nextCursor when the result page is full', async () => {
    const tx = buildTx();
    const fixture = Array.from({ length: 3 }, (_, i) => ({
      id: `a${i}`,
      userId: null,
      entity: 'sales.invoice',
      entityId: `e${i}`,
      action: 'create',
      before: null,
      after: null,
      createdAt: new Date(),
      user: null,
    }));
    tx.auditLog.findMany.mockResolvedValue(fixture);
    installTx(tx);

    const result = await getTenantActivity(TENANT_ID, { limit: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.nextCursor).toBe('a1');
  });
});

describe('getTenantDebug', () => {
  it('produces a non-empty tables list with row counts and sizes', async () => {
    const tx = buildTx();
    tx.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema')) {
        return [{ table_name: 'catalog_sales_customer' }, { table_name: 'document_sales_invoice' }];
      }
      if (sql.startsWith('SELECT COUNT(*)')) {
        return [{ count: 5n }];
      }
      if (sql.startsWith('SELECT pg_total_relation_size')) {
        return [{ size: 1024n }];
      }
      return [];
    });
    tx.membership.count.mockResolvedValue(3);
    installTx(tx);

    const result = await getTenantDebug(TENANT_ID);
    expect(result.tables).toHaveLength(2);
    expect(result.tables[0]).toEqual({
      table: 'catalog_sales_customer',
      rowCount: 5,
      sizeBytes: 1024,
    });
    expect(result.totalBytes).toBe(2048);
    expect(result.membershipCount).toBe(3);
  });

  it('skips tables that throw on the COUNT query', async () => {
    const tx = buildTx();
    tx.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema')) {
        return [{ table_name: 'catalog_legit' }, { table_name: 'catalog_no_tenant_column' }];
      }
      if (sql.startsWith('SELECT COUNT(*)') && sql.includes('catalog_no_tenant_column')) {
        throw new Error('column tenant_id does not exist');
      }
      if (sql.startsWith('SELECT COUNT(*)')) {
        return [{ count: 7n }];
      }
      if (sql.startsWith('SELECT pg_total_relation_size')) {
        return [{ size: 100n }];
      }
      return [];
    });
    tx.membership.count.mockResolvedValue(0);
    installTx(tx);

    const result = await getTenantDebug(TENANT_ID);
    expect(result.tables).toEqual([{ table: 'catalog_legit', rowCount: 7, sizeBytes: 100 }]);
  });
});
