import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuditFindMany = vi.hoisted(() => vi.fn());
const mockAuditFindUnique = vi.hoisted(() => vi.fn());
const mockTenantFindMany = vi.hoisted(() => vi.fn());
const mockTenantFindUnique = vi.hoisted(() => vi.fn());

const mockWithBypass = vi.hoisted(() =>
  vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      platformAuditLog: {
        findMany: mockAuditFindMany,
        findUnique: mockAuditFindUnique,
      },
      tenant: {
        findMany: mockTenantFindMany,
        findUnique: mockTenantFindUnique,
      },
    }),
  ),
);

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

import { getPlatformAuditEntry, listPlatformAudit } from './list-platform-audit';

interface FakeAuditRow {
  id: string;
  actorClerkId: string;
  action: string;
  tenantId: string | null;
  targetUserId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

function makeRow(overrides: Partial<FakeAuditRow> = {}): FakeAuditRow {
  return {
    id: overrides.id ?? 'a1',
    actorClerkId: overrides.actorClerkId ?? 'cu_actor',
    action: overrides.action ?? 'plan.changed',
    tenantId: overrides.tenantId ?? null,
    targetUserId: overrides.targetUserId ?? null,
    before: overrides.before ?? null,
    after: overrides.after ?? null,
    ip: overrides.ip ?? null,
    userAgent: overrides.userAgent ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-05-01T00:00:00Z'),
  };
}

interface FindManyArgs {
  where: Record<string, unknown>;
  orderBy?: unknown;
  take?: number;
  cursor?: { id: string };
  skip?: number;
}

function lastAuditFindManyArgs(): FindManyArgs {
  const call = mockAuditFindMany.mock.calls[mockAuditFindMany.mock.calls.length - 1];
  if (!call) throw new Error('expected mockAuditFindMany to have been called');
  return call[0] as FindManyArgs;
}

describe('listPlatformAudit', () => {
  beforeEach(() => {
    mockAuditFindMany.mockReset();
    mockAuditFindUnique.mockReset();
    mockTenantFindMany.mockReset();
    mockTenantFindUnique.mockReset();
    mockWithBypass.mockClear();
    // Default: no tenant join needed.
    mockTenantFindMany.mockResolvedValue([]);
  });

  it('returns empty rows + null cursor when no entries match', async () => {
    mockAuditFindMany.mockResolvedValue([]);
    const result = await listPlatformAudit();
    expect(result).toEqual({ rows: [], nextCursor: null });
    expect(mockWithBypass).toHaveBeenCalledTimes(1);
  });

  it('omits filter keys when not provided', async () => {
    mockAuditFindMany.mockResolvedValue([]);
    await listPlatformAudit();
    const args = lastAuditFindManyArgs();
    expect('action' in args.where).toBe(false);
    expect('actorClerkId' in args.where).toBe(false);
    expect('tenantId' in args.where).toBe(false);
  });

  it('forwards action / actorClerkId / tenantId filters', async () => {
    mockAuditFindMany.mockResolvedValue([]);
    await listPlatformAudit({
      action: 'plan.changed',
      actorClerkId: 'cu_admin',
      tenantId: '00000000-0000-0000-0000-000000000001',
    });
    const args = lastAuditFindManyArgs();
    expect(args.where.action).toBe('plan.changed');
    expect(args.where.actorClerkId).toBe('cu_admin');
    expect(args.where.tenantId).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('sorts createdAt desc', async () => {
    mockAuditFindMany.mockResolvedValue([]);
    await listPlatformAudit();
    expect(lastAuditFindManyArgs().orderBy).toEqual({ createdAt: 'desc' });
  });

  it('defaults limit to 50, take = limit + 1, clamps to 200', async () => {
    mockAuditFindMany.mockResolvedValue([]);
    await listPlatformAudit();
    expect(lastAuditFindManyArgs().take).toBe(51);

    mockAuditFindMany.mockClear();
    await listPlatformAudit({ limit: 10 });
    expect(lastAuditFindManyArgs().take).toBe(11);

    mockAuditFindMany.mockClear();
    await listPlatformAudit({ limit: 500 });
    expect(lastAuditFindManyArgs().take).toBe(201);
  });

  it('passes cursor through with skip:1', async () => {
    mockAuditFindMany.mockResolvedValue([]);
    await listPlatformAudit({ cursor: 'a42' });
    const args = lastAuditFindManyArgs();
    expect(args.cursor).toEqual({ id: 'a42' });
    expect(args.skip).toBe(1);
  });

  it('omits cursor + skip when no cursor provided', async () => {
    mockAuditFindMany.mockResolvedValue([]);
    await listPlatformAudit();
    const args = lastAuditFindManyArgs();
    expect('cursor' in args).toBe(false);
    expect('skip' in args).toBe(false);
  });

  it('returns nextCursor + drops the extra row when hasMore', async () => {
    mockAuditFindMany.mockResolvedValue([
      makeRow({ id: 'a1' }),
      makeRow({ id: 'a2' }),
      makeRow({ id: 'a3' }),
    ]);
    const result = await listPlatformAudit({ limit: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.id)).toEqual(['a1', 'a2']);
    expect(result.nextCursor).toBe('a2');
  });

  it('returns null cursor when result fits within the limit', async () => {
    mockAuditFindMany.mockResolvedValue([makeRow({ id: 'a1' }), makeRow({ id: 'a2' })]);
    const result = await listPlatformAudit({ limit: 50 });
    expect(result.rows.map((r) => r.id)).toEqual(['a1', 'a2']);
    expect(result.nextCursor).toBeNull();
  });

  it('batch-joins tenant names for rows with tenantId', async () => {
    mockAuditFindMany.mockResolvedValue([
      makeRow({ id: 'a1', tenantId: 't1' }),
      makeRow({ id: 'a2', tenantId: 't2' }),
      makeRow({ id: 'a3', tenantId: null }),
    ]);
    mockTenantFindMany.mockResolvedValue([
      { id: 't1', name: 'Acme' },
      { id: 't2', name: 'Globex' },
    ]);

    const result = await listPlatformAudit();

    expect(mockTenantFindMany).toHaveBeenCalledTimes(1);
    expect(mockTenantFindMany).toHaveBeenCalledWith({
      where: { id: { in: expect.arrayContaining(['t1', 't2']) } },
      select: { id: true, name: true },
    });
    expect(result.rows[0]).toMatchObject({ tenantId: 't1', tenantName: 'Acme' });
    expect(result.rows[1]).toMatchObject({ tenantId: 't2', tenantName: 'Globex' });
    expect(result.rows[2]).toMatchObject({ tenantId: null, tenantName: null });
  });

  it('skips tenant join entirely when no rows carry tenantId', async () => {
    mockAuditFindMany.mockResolvedValue([
      makeRow({ id: 'a1', tenantId: null }),
      makeRow({ id: 'a2', tenantId: null }),
    ]);

    const result = await listPlatformAudit();

    expect(mockTenantFindMany).not.toHaveBeenCalled();
    expect(result.rows.every((r) => r.tenantName === null)).toBe(true);
  });

  it('sets tenantName to null when the join misses', async () => {
    mockAuditFindMany.mockResolvedValue([makeRow({ id: 'a1', tenantId: 't_missing' })]);
    mockTenantFindMany.mockResolvedValue([]);

    const result = await listPlatformAudit();
    expect(result.rows[0]).toMatchObject({ tenantId: 't_missing', tenantName: null });
  });
});

describe('getPlatformAuditEntry', () => {
  beforeEach(() => {
    mockAuditFindMany.mockReset();
    mockAuditFindUnique.mockReset();
    mockTenantFindMany.mockReset();
    mockTenantFindUnique.mockReset();
    mockWithBypass.mockClear();
  });

  it('returns null when no entry exists', async () => {
    mockAuditFindUnique.mockResolvedValue(null);
    const result = await getPlatformAuditEntry('a_missing');
    expect(result).toBeNull();
    expect(mockAuditFindUnique).toHaveBeenCalledWith({ where: { id: 'a_missing' } });
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
  });

  it('maps fields and joins the tenant name when tenantId is set', async () => {
    mockAuditFindUnique.mockResolvedValue(
      makeRow({
        id: 'a1',
        tenantId: 't1',
        action: 'plan.changed',
        before: { plan: 'free' },
        after: { plan: 'pro' },
        ip: '127.0.0.1',
        userAgent: 'curl/8',
      }),
    );
    mockTenantFindUnique.mockResolvedValue({ name: 'Acme' });

    const result = await getPlatformAuditEntry('a1');
    expect(result).toMatchObject({
      id: 'a1',
      action: 'plan.changed',
      tenantId: 't1',
      tenantName: 'Acme',
      before: { plan: 'free' },
      after: { plan: 'pro' },
      ip: '127.0.0.1',
      userAgent: 'curl/8',
    });
  });

  it('skips the tenant lookup when tenantId is null', async () => {
    mockAuditFindUnique.mockResolvedValue(makeRow({ id: 'a1', tenantId: null }));

    const result = await getPlatformAuditEntry('a1');
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'a1', tenantId: null, tenantName: null });
  });

  it('sets tenantName to null when the tenant lookup misses', async () => {
    mockAuditFindUnique.mockResolvedValue(makeRow({ id: 'a1', tenantId: 't_missing' }));
    mockTenantFindUnique.mockResolvedValue(null);

    const result = await getPlatformAuditEntry('a1');
    expect(result).toMatchObject({ id: 'a1', tenantId: 't_missing', tenantName: null });
  });
});
