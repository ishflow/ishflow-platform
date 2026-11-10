import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('GET /api/mobile/notifications', () => {
  it('returns 401 when no context', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      requireTenantContext: async () => {
        throw new Error('unauth');
      },
    }));
    const { GET } = await import('./route');
    const res = await GET(new Request('https://x/api/mobile/notifications'));
    expect(res.status).toBe(401);
  });

  it('returns paginated empty list for tenant with no notifications', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      requireTenantContext: async () => ({
        user: { id: 'u' },
        tenant: { id: 't' },
        permissions: new Set<string>(),
      }),
    }));
    const { GET } = await import('./route');
    const res = await GET(new Request('https://x/api/mobile/notifications'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  });
});
