import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MOBILE_JWT_SECRET = 'a'.repeat(48);
});

beforeEach(() => {
  vi.resetModules();
});

describe('GET /api/mobile/tenants', () => {
  it('returns 401 when no context', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => null,
    }));
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns the list of tenants the user belongs to', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1' },
        tenant: { id: 't1' },
        membership: null,
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    vi.doMock('@/platform/db', () => ({
      prisma: {
        membership: {
          findMany: vi.fn().mockResolvedValue([
            {
              tenant: {
                id: '00000000-0000-0000-0000-000000000001',
                slug: 's1',
                name: 'One',
                currency: 'USD',
                mobileFeatures: {},
              },
            },
            {
              tenant: {
                id: '00000000-0000-0000-0000-000000000002',
                slug: 's2',
                name: 'Two',
                currency: 'EUR',
                mobileFeatures: { sales: false },
              },
            },
          ]),
        },
      },
    }));
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toMatchObject({
      id: '00000000-0000-0000-0000-000000000001',
      slug: 's1',
      name: 'One',
      currency: 'USD',
    });
    // DEFAULT_MOBILE_FEATURES applied + tenant override merged.
    expect(body.items[0].mobileFeatures.sales).toBe(true);
    expect(body.items[1].mobileFeatures.sales).toBe(false);
    expect(body.items[1].mobileFeatures.prices).toBe(true);
  });

  it('falls back to USD when tenant.currency is missing', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1' },
        tenant: null,
        membership: null,
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    vi.doMock('@/platform/db', () => ({
      prisma: {
        membership: {
          findMany: vi.fn().mockResolvedValue([
            {
              tenant: {
                id: '00000000-0000-0000-0000-000000000003',
                slug: 's3',
                name: 'Three',
                currency: null,
                mobileFeatures: null,
              },
            },
          ]),
        },
      },
    }));
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].currency).toBe('USD');
  });
});

describe('POST /api/mobile/tenants/active', () => {
  it('returns 401 when no context', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => null,
    }));
    const { POST } = await import('./active/route');
    const res = await POST(
      new Request('https://x/api/mobile/tenants/active', {
        method: 'POST',
        body: JSON.stringify({ tenantId: '00000000-0000-0000-0000-000000000001' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is missing tenantId', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1' },
        tenant: { id: 't1' },
        membership: null,
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    const { POST } = await import('./active/route');
    const res = await POST(
      new Request('https://x/api/mobile/tenants/active', {
        method: 'POST',
        body: '',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when tenantId is not a uuid', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1' },
        tenant: { id: 't1' },
        membership: null,
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    const { POST } = await import('./active/route');
    const res = await POST(
      new Request('https://x/api/mobile/tenants/active', {
        method: 'POST',
        body: JSON.stringify({ tenantId: 'not-a-uuid' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 403 when user is not a member of the requested tenant', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1' },
        tenant: { id: 't1' },
        membership: null,
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    vi.doMock('@/platform/db', () => ({
      prisma: {
        membership: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    }));
    const { POST } = await import('./active/route');
    const res = await POST(
      new Request('https://x/api/mobile/tenants/active', {
        method: 'POST',
        body: JSON.stringify({ tenantId: '00000000-0000-0000-0000-0000000000ff' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 200 with new JWT when user is a member of the requested tenant', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1', clerkId: 'user_clerk_abc' },
        tenant: { id: 't1' },
        membership: null,
        permissions: new Set(['sales.read', 'prices.read']),
        scopesByEntity: new Map(),
      }),
    }));
    vi.doMock('@/platform/db', () => ({
      prisma: {
        membership: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'm-99',
            tenantId: '00000000-0000-0000-0000-0000000000aa',
            userId: 'u1',
          }),
        },
      },
    }));
    const { POST } = await import('./active/route');
    const res = await POST(
      new Request('https://x/api/mobile/tenants/active', {
        method: 'POST',
        body: JSON.stringify({ tenantId: '00000000-0000-0000-0000-0000000000aa' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(20);

    // The minted JWT must carry the new tenantId in its claims.
    const { verifyMobileJWT } = await import('@/platform/auth/mobile-jwt');
    const claims = await verifyMobileJWT(body.token);
    expect(claims.tenantId).toBe('00000000-0000-0000-0000-0000000000aa');
    // Regression: claims.userId MUST be the Clerk id (matches User.clerkId)
    // not the platform UUID (User.id) — the bearer path looks up users by
    // clerkId, so a UUID here would silently break every subsequent API call.
    expect(claims.userId).toBe('user_clerk_abc');
    expect(claims.userId).not.toBe('u1');
    // Scopes round-trip from the AppContext permissions Set.
    expect(claims.scopes).toEqual(expect.arrayContaining(['sales.read', 'prices.read']));
  });
});
