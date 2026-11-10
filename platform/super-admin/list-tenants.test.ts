import type { TenantPlan, TenantStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindMany = vi.hoisted(() => vi.fn());
const mockWithBypass = vi.hoisted(() =>
  vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ tenant: { findMany: mockFindMany } }),
  ),
);

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

import { listTenants } from './list-tenants';

interface FakeTenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  currency: string;
  lastActivityAt: Date | null;
  createdAt: Date;
  _count: { memberships: number };
}

function makeTenant(overrides: Partial<FakeTenant> = {}): FakeTenant {
  return {
    id: overrides.id ?? 't1',
    name: overrides.name ?? 'Acme',
    slug: overrides.slug ?? 'acme',
    plan: overrides.plan ?? 'free',
    status: overrides.status ?? 'trialing',
    currency: overrides.currency ?? 'USD',
    lastActivityAt: overrides.lastActivityAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00Z'),
    _count: overrides._count ?? { memberships: 1 },
  };
}

interface FindManyArgs {
  where: {
    deletedAt?: Date | null;
    plan?: TenantPlan;
    status?: TenantStatus;
    OR?: Array<Record<string, unknown>>;
  };
  orderBy?: unknown;
  take?: number;
  cursor?: { id: string };
  skip?: number;
  include?: unknown;
}

function lastCallArgs(): FindManyArgs {
  const call = mockFindMany.mock.calls[mockFindMany.mock.calls.length - 1];
  if (!call) throw new Error('expected mockFindMany to have been called');
  return call[0] as FindManyArgs;
}

describe('listTenants', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockWithBypass.mockClear();
  });

  it('returns empty rows + null cursor when no tenants', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await listTenants();
    expect(result).toEqual({ rows: [], nextCursor: null });
    expect(mockWithBypass).toHaveBeenCalledTimes(1);
  });

  it('maps tenant rows + computes MRR in USD', async () => {
    mockFindMany.mockResolvedValue([
      makeTenant({ id: 't1', plan: 'pro', currency: 'USD', _count: { memberships: 4 } }),
      makeTenant({ id: 't2', plan: 'free', currency: 'EUR', _count: { memberships: 1 } }),
    ]);

    const result = await listTenants();

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      id: 't1',
      plan: 'pro',
      currency: 'USD',
      memberCount: 4,
      mrrUsd: 49,
    });
    expect(result.rows[1]).toMatchObject({
      id: 't2',
      plan: 'free',
      memberCount: 1,
      mrrUsd: 0,
    });
    expect(result.nextCursor).toBeNull();
  });

  it('forwards the q filter as case-insensitive contains on name/slug', async () => {
    mockFindMany.mockResolvedValue([]);
    await listTenants({ q: 'acme' });
    const args = lastCallArgs();
    expect(args.where.OR).toEqual([
      { name: { contains: 'acme', mode: 'insensitive' } },
      { slug: { contains: 'acme', mode: 'insensitive' } },
    ]);
    expect(args.where.deletedAt).toBeNull();
  });

  it('forwards plan + status filters', async () => {
    mockFindMany.mockResolvedValue([]);
    await listTenants({ plan: 'pro', status: 'active' });
    const args = lastCallArgs();
    expect(args.where.plan).toBe('pro');
    expect(args.where.status).toBe('active');
  });

  it('omits filter keys when not provided', async () => {
    mockFindMany.mockResolvedValue([]);
    await listTenants();
    const args = lastCallArgs();
    expect('plan' in args.where).toBe(false);
    expect('status' in args.where).toBe(false);
    expect('OR' in args.where).toBe(false);
  });

  it('clamps limit to 100 and defaults to 25', async () => {
    mockFindMany.mockResolvedValue([]);
    await listTenants();
    expect(lastCallArgs().take).toBe(26);

    mockFindMany.mockClear();
    await listTenants({ limit: 10 });
    expect(lastCallArgs().take).toBe(11);

    mockFindMany.mockClear();
    await listTenants({ limit: 500 });
    expect(lastCallArgs().take).toBe(101);
  });

  it('returns nextCursor + drops the extra row when hasMore', async () => {
    mockFindMany.mockResolvedValue([
      makeTenant({ id: 't1' }),
      makeTenant({ id: 't2' }),
      makeTenant({ id: 't3' }),
    ]);
    const result = await listTenants({ limit: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.id)).toEqual(['t1', 't2']);
    expect(result.nextCursor).toBe('t2');
  });

  it('passes cursor through with skip:1', async () => {
    mockFindMany.mockResolvedValue([]);
    await listTenants({ cursor: 't42' });
    const args = lastCallArgs();
    expect(args.cursor).toEqual({ id: 't42' });
    expect(args.skip).toBe(1);
  });

  it('omits cursor + skip when no cursor provided', async () => {
    mockFindMany.mockResolvedValue([]);
    await listTenants();
    const args = lastCallArgs();
    expect('cursor' in args).toBe(false);
    expect('skip' in args).toBe(false);
  });

  it('sorts lastActivityAt desc nulls last, createdAt desc', async () => {
    mockFindMany.mockResolvedValue([]);
    await listTenants();
    const args = lastCallArgs();
    expect(args.orderBy).toEqual([
      { lastActivityAt: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
    ]);
  });

  it('always filters out soft-deleted tenants', async () => {
    mockFindMany.mockResolvedValue([]);
    await listTenants({ plan: 'pro' });
    expect(lastCallArgs().where.deletedAt).toBeNull();
  });
});
