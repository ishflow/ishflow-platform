import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mutable per-test state for the mocked Prisma layer. Tests assign before
// calling resolveApiKeyContext so each branch is exercised in isolation.
type FakeApiKey = {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scope: 'read' | 'write';
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  createdById: string;
  tenant: { id: string; name: string };
  createdBy: { id: string; clerkId: string };
};

let candidateRows: FakeApiKey[] = [];
let lastFindManyArgs: { where?: Record<string, unknown> } | undefined;
let updateManyCalls: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = [];
let updateManyShouldThrow = false;

const mockVerifyApiKey = vi.hoisted(() => vi.fn());
const mockScopeToPermissions = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: <T>(fn: (tx: unknown) => Promise<T>) =>
    fn({
      apiKey: {
        findMany: async (args: { where?: Record<string, unknown> }) => {
          lastFindManyArgs = args;
          // Honor the WHERE filter: tests set candidateRows directly, so we
          // just return the array. Revoked-row filtering is asserted via the
          // WHERE-clause shape, not via DB-side filtering in the mock.
          return candidateRows;
        },
        updateMany: async (args: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => {
          updateManyCalls.push(args);
          if (updateManyShouldThrow) {
            throw new Error('updateMany failure (simulated)');
          }
          return { count: 1 };
        },
      },
    }),
}));

vi.mock('@/platform/api-keys/hash', () => ({
  verifyApiKey: mockVerifyApiKey,
}));

vi.mock('@/platform/api-keys/permissions', () => ({
  scopeToPermissions: mockScopeToPermissions,
}));

import { ApiKeyAuthError, resolveApiKeyContext } from './resolve-api-key';

function makeCandidate(overrides: Partial<FakeApiKey> = {}): FakeApiKey {
  return {
    id: 'ak1',
    tenantId: 't1',
    name: 'Test key',
    keyPrefix: '1ca_live_abcdefg',
    keyHash: '$2b$10$hash',
    scope: 'read',
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date('2026-05-01T00:00:00Z'),
    createdById: 'u1',
    tenant: { id: 't1', name: 'Acme' },
    createdBy: { id: 'u1', clerkId: 'cu1' },
    ...overrides,
  };
}

// A real key is 41 chars: '1ca_live_' (9) + 32 hex chars.
const VALID_KEY = `1ca_live_${'a'.repeat(32)}`;
const VALID_PREFIX = VALID_KEY.slice(0, 16);

describe('resolveApiKeyContext', () => {
  beforeEach(() => {
    candidateRows = [];
    lastFindManyArgs = undefined;
    updateManyCalls = [];
    updateManyShouldThrow = false;
    mockVerifyApiKey.mockReset();
    mockScopeToPermissions.mockReset();
    mockScopeToPermissions.mockImplementation((scope: string) =>
      scope === 'write' ? new Set(['*:read', '*:write']) : new Set(['*:read']),
    );
  });

  it('returns null and skips DB when token does not start with 1ca_live_', async () => {
    const ctx = await resolveApiKeyContext('sk_live_deadbeef');
    expect(ctx).toBeNull();
    expect(lastFindManyArgs).toBeUndefined();
    expect(mockVerifyApiKey).not.toHaveBeenCalled();
  });

  it('returns null and skips DB when length is not 41', async () => {
    const ctx = await resolveApiKeyContext('1ca_live_short');
    expect(ctx).toBeNull();
    expect(lastFindManyArgs).toBeUndefined();
    expect(mockVerifyApiKey).not.toHaveBeenCalled();
  });

  it('returns null when no DB rows match the prefix', async () => {
    candidateRows = [];
    const ctx = await resolveApiKeyContext(VALID_KEY);
    expect(ctx).toBeNull();
    expect(lastFindManyArgs?.where).toMatchObject({
      keyPrefix: VALID_PREFIX,
      revokedAt: null,
    });
    expect(mockVerifyApiKey).not.toHaveBeenCalled();
  });

  it('returns null when bcrypt.compare fails on every candidate', async () => {
    candidateRows = [makeCandidate({ id: 'a' }), makeCandidate({ id: 'b' })];
    mockVerifyApiKey.mockResolvedValue(false);

    const ctx = await resolveApiKeyContext(VALID_KEY);

    expect(ctx).toBeNull();
    expect(mockVerifyApiKey).toHaveBeenCalledTimes(2);
    expect(updateManyCalls).toHaveLength(0);
  });

  it('issues a WHERE clause that filters out revoked rows', async () => {
    // The mock receives the WHERE filter verbatim. We don't filter inside
    // the mock — instead we assert the WHERE clause was correctly shaped.
    candidateRows = [];
    await resolveApiKeyContext(VALID_KEY);
    expect(lastFindManyArgs?.where).toEqual({
      keyPrefix: VALID_PREFIX,
      revokedAt: null,
    });
  });

  it('returns a synthetic AppContext on successful match (read scope)', async () => {
    candidateRows = [makeCandidate({ scope: 'read' })];
    mockVerifyApiKey.mockResolvedValue(true);

    const ctx = await resolveApiKeyContext(VALID_KEY);

    expect(ctx).not.toBeNull();
    expect(ctx?.user.id).toBe('u1');
    expect(ctx?.tenant?.id).toBe('t1');
    expect(ctx?.membership).toBeNull();
    expect(ctx?.permissions.has('*:read')).toBe(true);
    expect(ctx?.permissions.has('*:write')).toBe(false);
    expect(ctx?.scopesByEntity.size).toBe(0);
    expect(mockScopeToPermissions).toHaveBeenCalledWith('read');
  });

  it('grants write permissions when key scope is write', async () => {
    candidateRows = [makeCandidate({ scope: 'write' })];
    mockVerifyApiKey.mockResolvedValue(true);

    const ctx = await resolveApiKeyContext(VALID_KEY);

    expect(ctx?.permissions.has('*:read')).toBe(true);
    expect(ctx?.permissions.has('*:write')).toBe(true);
    expect(mockScopeToPermissions).toHaveBeenCalledWith('write');
  });

  it('fires the lastUsedAt update when lastUsedAt is null', async () => {
    candidateRows = [makeCandidate({ id: 'ak-null', lastUsedAt: null })];
    mockVerifyApiKey.mockResolvedValue(true);

    await resolveApiKeyContext(VALID_KEY);

    expect(updateManyCalls).toHaveLength(1);
    const call = updateManyCalls[0];
    if (!call) throw new Error('expected updateMany to have been called');
    expect(call.where.id).toBe('ak-null');
    // WHERE clause must guard against races by re-checking lastUsedAt
    // server-side. Concurrent requests both passing the JS-side check would
    // otherwise issue redundant writes.
    expect(call.where.OR).toEqual([{ lastUsedAt: null }, { lastUsedAt: { lt: expect.any(Date) } }]);
    expect(call.data.lastUsedAt).toBeInstanceOf(Date);
  });

  it('fires the lastUsedAt update when lastUsedAt is older than 1 minute', async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
    candidateRows = [makeCandidate({ id: 'ak-stale', lastUsedAt: fiveMinAgo })];
    mockVerifyApiKey.mockResolvedValue(true);

    await resolveApiKeyContext(VALID_KEY);

    expect(updateManyCalls).toHaveLength(1);
    expect(updateManyCalls[0]?.where.id).toBe('ak-stale');
  });

  it('suppresses the lastUsedAt update when lastUsedAt is fresh (<1 min)', async () => {
    const thirtySecAgo = new Date(Date.now() - 30_000);
    candidateRows = [makeCandidate({ id: 'ak-fresh', lastUsedAt: thirtySecAgo })];
    mockVerifyApiKey.mockResolvedValue(true);

    const ctx = await resolveApiKeyContext(VALID_KEY);

    expect(ctx).not.toBeNull();
    expect(updateManyCalls).toHaveLength(0);
  });

  it('still returns the AppContext when the lastUsedAt update throws', async () => {
    candidateRows = [makeCandidate({ id: 'ak-x', lastUsedAt: null })];
    mockVerifyApiKey.mockResolvedValue(true);
    updateManyShouldThrow = true;

    const ctx = await resolveApiKeyContext(VALID_KEY);

    expect(ctx).not.toBeNull();
    expect(ctx?.tenant?.id).toBe('t1');
    expect(updateManyCalls).toHaveLength(1);
  });

  it('exports ApiKeyAuthError with status + code propagation', () => {
    const err = new ApiKeyAuthError(402, 'feature_locked', 'plan does not include apiAccess');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiKeyAuthError');
    expect(err.status).toBe(402);
    expect(err.code).toBe('feature_locked');
    expect(err.message).toBe('plan does not include apiAccess');
  });
});
