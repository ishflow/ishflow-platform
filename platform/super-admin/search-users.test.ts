import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockUserRow {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  memberships: Array<{
    tenantId: string;
    tenant: { name: string };
    roles: Array<{ name: string }>;
  }>;
}

const findManyMock = vi.hoisted(() => vi.fn());
const withBypassMock = vi.hoisted(() =>
  vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = { user: { findMany: findManyMock } };
    return fn(tx);
  }),
);

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: withBypassMock,
}));

const { searchUsers } = await import('./search-users');

const SAMPLE: MockUserRow = {
  id: 'u-1',
  clerkId: 'user_abc',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Anderson',
  createdAt: new Date('2026-04-01T00:00:00Z'),
  deletedAt: null,
  memberships: [
    {
      tenantId: 't-1',
      tenant: { name: 'Acme' },
      roles: [{ name: 'owner' }, { name: 'admin' }],
    },
  ],
};

describe('searchUsers', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    withBypassMock.mockClear();
  });

  it('returns an empty array for an empty query', async () => {
    const out = await searchUsers('');
    expect(out).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
    expect(withBypassMock).not.toHaveBeenCalled();
  });

  it('returns an empty array for a single-character query', async () => {
    const out = await searchUsers('a');
    expect(out).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('treats whitespace-only input as empty', async () => {
    const out = await searchUsers('   ');
    expect(out).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('returns one row when an exact clerkId matches', async () => {
    findManyMock.mockResolvedValueOnce([SAMPLE]);

    const out = await searchUsers('user_abc');

    expect(withBypassMock).toHaveBeenCalledOnce();
    expect(findManyMock).toHaveBeenCalledOnce();
    const args = findManyMock.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    expect(args.where.OR).toContainEqual({ clerkId: 'user_abc' });
    expect(args.take).toBe(50);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });

    expect(out).toHaveLength(1);
    const [row] = out;
    expect(row).toBeDefined();
    if (row) {
      expect(row.id).toBe('u-1');
      expect(row.clerkId).toBe('user_abc');
      expect(row.email).toBe('alice@example.com');
      expect(row.memberships).toEqual([
        { tenantId: 't-1', tenantName: 'Acme', roleNames: ['owner', 'admin'] },
      ]);
    }
  });

  it('passes a case-insensitive ILIKE clause on email', async () => {
    findManyMock.mockResolvedValueOnce([SAMPLE]);

    await searchUsers('ALICE');

    const args = findManyMock.mock.calls[0]?.[0];
    expect(args.where.OR).toContainEqual({
      email: { contains: 'ALICE', mode: 'insensitive' },
    });
    expect(args.where.OR).toContainEqual({
      firstName: { contains: 'ALICE', mode: 'insensitive' },
    });
    expect(args.where.OR).toContainEqual({
      lastName: { contains: 'ALICE', mode: 'insensitive' },
    });
  });

  it('trims the query before searching', async () => {
    findManyMock.mockResolvedValueOnce([]);

    await searchUsers('  bob  ');

    const args = findManyMock.mock.calls[0]?.[0];
    expect(args.where.OR).toContainEqual({ clerkId: 'bob' });
    expect(args.where.OR).toContainEqual({
      email: { contains: 'bob', mode: 'insensitive' },
    });
  });

  it('maps multiple memberships per user', async () => {
    findManyMock.mockResolvedValueOnce([
      {
        ...SAMPLE,
        memberships: [
          {
            tenantId: 't-1',
            tenant: { name: 'Acme' },
            roles: [{ name: 'owner' }],
          },
          {
            tenantId: 't-2',
            tenant: { name: 'Globex' },
            roles: [],
          },
        ],
      },
    ]);

    const out = await searchUsers('alice');
    const row = out[0];
    expect(row).toBeDefined();
    if (row) {
      expect(row.memberships).toEqual([
        { tenantId: 't-1', tenantName: 'Acme', roleNames: ['owner'] },
        { tenantId: 't-2', tenantName: 'Globex', roleNames: [] },
      ]);
    }
  });

  it('returns an empty array when no users match', async () => {
    findManyMock.mockResolvedValueOnce([]);

    const out = await searchUsers('nobody');

    expect(out).toEqual([]);
    expect(withBypassMock).toHaveBeenCalledOnce();
  });
});
