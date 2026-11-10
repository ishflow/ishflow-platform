import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn((globalThis as unknown as { __mockTx: unknown }).__mockTx);
  }),
}));

import { loadSaUser } from './load-sa-user';

function setMockTx(tx: unknown) {
  (globalThis as unknown as { __mockTx: unknown }).__mockTx = tx;
}

describe('loadSaUser', () => {
  it('returns null when the user does not exist', async () => {
    setMockTx({
      user: { findUnique: vi.fn(async (_args: unknown) => null) },
      platformAuditLog: { findMany: vi.fn(async (_args: unknown) => []) },
      tenant: { findMany: vi.fn(async (_args: unknown) => []) },
    });
    const result = await loadSaUser('does-not-exist');
    expect(result).toBeNull();
  });

  it('returns shaped record with memberships + recent audit', async () => {
    setMockTx({
      user: {
        findUnique: vi.fn(async (_args: unknown) => ({
          id: 'u1',
          clerkId: 'user_2abc',
          email: 'a@example.com',
          firstName: 'Ayşe',
          lastName: 'Demir',
          imageUrl: null,
          createdAt: new Date('2026-01-15'),
          deletedAt: null,
          memberships: [
            {
              id: 'm1',
              tenantId: 't1',
              createdAt: new Date('2026-02-01'),
              tenant: { id: 't1', name: 'Acme', slug: 'acme' },
              roles: [{ name: 'owner' }, { name: 'admin' }],
            },
          ],
        })),
      },
      platformAuditLog: {
        findMany: vi.fn(async (_args: unknown) => [
          {
            id: 'a1',
            action: 'tenant.suspended',
            tenantId: 't1',
            createdAt: new Date('2026-05-20'),
          },
        ]),
      },
      tenant: {
        findMany: vi.fn(async (_args: unknown) => [{ id: 't1', name: 'Acme' }]),
      },
    });
    const result = await loadSaUser('u1');
    expect(result).toMatchObject({
      id: 'u1',
      email: 'a@example.com',
      fullName: 'Ayşe Demir',
      status: 'active',
      memberships: [
        {
          membershipId: 'm1',
          tenantName: 'Acme',
          roleNames: ['owner', 'admin'],
        },
      ],
      recentAudit: [
        {
          id: 'a1',
          action: 'tenant.suspended',
          tenantName: 'Acme',
        },
      ],
    });
  });

  it('returns status=deleted + empty audit when soft-deleted user has no platform actions', async () => {
    setMockTx({
      user: {
        findUnique: vi.fn(async (_args: unknown) => ({
          id: 'u2',
          clerkId: 'user_2def',
          email: 'b@example.com',
          firstName: null,
          lastName: null,
          imageUrl: null,
          createdAt: new Date('2026-01-01'),
          deletedAt: new Date('2026-05-01'),
          memberships: [],
        })),
      },
      platformAuditLog: { findMany: vi.fn(async (_args: unknown) => []) },
      tenant: { findMany: vi.fn(async (_args: unknown) => []) },
    });
    const result = await loadSaUser('u2');
    expect(result?.status).toBe('deleted');
    expect(result?.fullName).toBeNull();
    expect(result?.memberships).toHaveLength(0);
    expect(result?.recentAudit).toHaveLength(0);
  });

  it('preserves null tenant on platform-wide audit entries', async () => {
    setMockTx({
      user: {
        findUnique: vi.fn(async (_args: unknown) => ({
          id: 'u3',
          clerkId: 'user_2ghi',
          email: 'c@example.com',
          firstName: 'C',
          lastName: null,
          imageUrl: null,
          createdAt: new Date('2026-04-01'),
          deletedAt: null,
          memberships: [],
        })),
      },
      platformAuditLog: {
        findMany: vi.fn(async (_args: unknown) => [
          { id: 'a2', action: 'platform.login', tenantId: null, createdAt: new Date() },
        ]),
      },
      tenant: { findMany: vi.fn(async (_args: unknown) => []) },
    });
    const result = await loadSaUser('u3');
    expect(result?.recentAudit[0]?.tenantName).toBeNull();
    expect(result?.recentAudit[0]?.tenantId).toBeNull();
  });
});
