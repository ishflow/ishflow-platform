import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MOBILE_JWT_SECRET = 'a'.repeat(48);
});

beforeEach(() => {
  vi.resetModules();
});

describe('GET /api/mobile/auth/bridge', () => {
  it('redirects to ishflow://auth/callback with token when Clerk session resolves', async () => {
    // The real AppContext shape has `permissions: Set<string>`; mock matches.
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1', email: 'a@b.c' },
        tenant: { id: 't1', slug: 's', name: 'n', currency: 'USD' },
        membership: null,
        permissions: new Set(['sales.read']),
        scopesByEntity: new Map(),
      }),
    }));
    const { GET } = await import('./route');
    const res = await GET(
      new Request('https://x/api/mobile/auth/bridge?return=ishflow://auth/callback'),
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toMatch(/^ishflow:\/\/auth\/callback\?token=/);
    // Cache-poisoning defense: the JWT must never be cached by an intermediary.
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('does not log PII (email / clerkId) — finding H2', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1', clerkId: 'user_secret123', email: 'secret@example.com' },
        tenant: { id: 't1', slug: 's', name: 'n', currency: 'USD' },
        membership: null,
        permissions: new Set(['sales.read']),
        scopesByEntity: new Map(),
      }),
    }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { GET } = await import('./route');
    await GET(new Request('https://x/api/mobile/auth/bridge?return=ishflow://auth/callback'));
    const logged = logSpy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
    logSpy.mockRestore();
    expect(logged).not.toContain('secret@example.com');
    expect(logged).not.toContain('user_secret123');
  });

  it('uses & separator when returnUrl already contains a query string', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1', email: 'a@b.c' },
        tenant: { id: 't1', slug: 's', name: 'n', currency: 'USD' },
        membership: null,
        permissions: new Set(['sales.read']),
        scopesByEntity: new Map(),
      }),
    }));
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        'https://x/api/mobile/auth/bridge?return=' +
          encodeURIComponent('ishflow://auth/callback?source=ios'),
      ),
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toMatch(/^ishflow:\/\/auth\/callback\?source=ios&token=/);
  });

  it('redirects with error=no_tenant when user has no active tenant', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1', email: 'a@b.c' },
        tenant: null,
        membership: null,
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    const { GET } = await import('./route');
    const res = await GET(
      new Request('https://x/api/mobile/auth/bridge?return=ishflow://auth/callback'),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('ishflow://auth/callback?error=no_tenant');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('uses & separator on no_tenant redirect when returnUrl already has a query string', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: { id: 'u1', email: 'a@b.c' },
        tenant: null,
        membership: null,
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        'https://x/api/mobile/auth/bridge?return=' +
          encodeURIComponent('ishflow://auth/callback?source=ios'),
      ),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'ishflow://auth/callback?source=ios&error=no_tenant',
    );
  });

  it('returns 401 when Clerk session is missing', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => null,
    }));
    const { GET } = await import('./route');
    const res = await GET(new Request('https://x/api/mobile/auth/bridge'));
    expect(res.status).toBe(401);
  });

  it('mints a JWT whose userId is the Clerk ID, not the platform UUID', async () => {
    // Regression: bridge previously signed `ctx.user.id` (platform UUID), but
    // the bearer path's resolveContext looks up users by `clerkId`. Every
    // real-mode iOS API call would have 401'd silently after falling through
    // to the Clerk session path. This test mints a token end-to-end and
    // decodes it to prove the JWT carries the Clerk ID.
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => ({
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          clerkId: 'user_clerk_xyz',
          email: 'a@b.c',
        },
        tenant: { id: 't1', slug: 's', name: 'n', currency: 'USD' },
        membership: null,
        permissions: new Set(['sales.read']),
        scopesByEntity: new Map(),
      }),
    }));
    const { GET } = await import('./route');
    const res = await GET(
      new Request('https://x/api/mobile/auth/bridge?return=ishflow://auth/callback'),
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    const tokenMatch = location.match(/[?&]token=([^&]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = decodeURIComponent(tokenMatch?.[1] ?? '');

    const { verifyMobileJWT } = await import('@/platform/auth/mobile-jwt');
    const claims = await verifyMobileJWT(token);
    // The contract: JWT `sub` (claims.userId) MUST be the Clerk user id so
    // resolveBearerContext's `findUnique({ where: { clerkId: claims.userId } })`
    // matches a real row.
    expect(claims.userId).toBe('user_clerk_xyz');
    expect(claims.userId).not.toBe('11111111-1111-1111-1111-111111111111');
    expect(claims.tenantId).toBe('t1');
  });
});
