import { describe, expect, it, vi } from 'vitest';

// Mock withBypass to invoke the callback with a fake tx set via setMockTx().
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn((globalThis as unknown as { __mockTx: unknown }).__mockTx);
  }),
}));

import { loadSaTenant } from './load-tenant';

function setMockTx(tx: unknown) {
  (globalThis as unknown as { __mockTx: unknown }).__mockTx = tx;
}

describe('loadSaTenant', () => {
  it('returns null when the tenant does not exist', async () => {
    setMockTx({
      tenant: { findUnique: vi.fn(async (_args: unknown) => null) },
      document_sales_invoice: { count: vi.fn(async (_args: unknown) => 0) },
    });
    const result = await loadSaTenant('does-not-exist');
    expect(result).toBeNull();
  });

  it('returns null when the tenant is soft-deleted', async () => {
    setMockTx({
      tenant: {
        findUnique: vi.fn(async (_args: unknown) => ({
          id: 't1',
          name: 'Old',
          slug: 'old',
          plan: 'free',
          status: 'deleted',
          defaultLocale: 'en',
          currency: 'USD',
          lastActivityAt: null,
          createdAt: new Date(),
          deletedAt: new Date(),
          _count: { memberships: 0 },
        })),
      },
      document_sales_invoice: { count: vi.fn(async (_args: unknown) => 0) },
    });
    const result = await loadSaTenant('t1');
    expect(result).toBeNull();
  });

  it('returns shaped record with computed mrrUsd + counts', async () => {
    setMockTx({
      tenant: {
        findUnique: vi.fn(async (_args: unknown) => ({
          id: 't1',
          name: 'Acme',
          slug: 'acme',
          plan: 'business',
          status: 'active',
          defaultLocale: 'tr',
          currency: 'TRY',
          lastActivityAt: new Date('2026-05-22'),
          createdAt: new Date('2026-04-01'),
          deletedAt: null,
          _count: { memberships: 5 },
        })),
      },
      document_sales_invoice: { count: vi.fn(async (_args: unknown) => 42) },
    });
    const result = await loadSaTenant('t1');
    expect(result).toMatchObject({
      id: 't1',
      name: 'Acme',
      slug: 'acme',
      plan: 'business',
      members: 5,
      invoices: 42,
      mrrUsd: 199,
      currency: 'TRY',
    });
  });

  it('maps unknown plan to mrrUsd=0', async () => {
    setMockTx({
      tenant: {
        findUnique: vi.fn(async (_args: unknown) => ({
          id: 't2',
          name: 'X',
          slug: 'x',
          plan: 'unknown_plan',
          status: 'active',
          defaultLocale: 'en',
          currency: 'USD',
          lastActivityAt: null,
          createdAt: new Date(),
          deletedAt: null,
          _count: { memberships: 0 },
        })),
      },
      document_sales_invoice: { count: vi.fn(async (_args: unknown) => 0) },
    });
    const result = await loadSaTenant('t2');
    expect(result?.mrrUsd).toBe(0);
  });
});
