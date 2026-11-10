import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MOBILE_JWT_SECRET = 'a'.repeat(48);
});

beforeEach(() => {
  vi.resetModules();
});

describe('GET /api/mobile/products/by-barcode', () => {
  it('returns 401 when no context', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      resolveContext: async () => null,
    }));
    const { GET } = await import('./route');
    const res = await GET(new Request('https://x/api/mobile/products/by-barcode?barcode=123'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when barcode is missing', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      requireTenantContext: async () => ({
        user: { id: 'u1' },
        tenant: { id: 't1' },
        membership: { id: 'm1' },
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    const { GET } = await import('./route');
    const res = await GET(new Request('https://x/api/mobile/products/by-barcode'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when barcode not found', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      requireTenantContext: async () => ({
        user: { id: 'u1' },
        tenant: { id: 't1' },
        membership: { id: 'm1' },
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    vi.doMock('@/platform/db/tenant-context', () => ({
      withTenant: vi.fn().mockResolvedValue(null),
    }));
    const { GET } = await import('./route');
    const res = await GET(new Request('https://x/api/mobile/products/by-barcode?barcode=999'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('barcode_not_found');
  });

  it('returns 200 with product when found', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      requireTenantContext: async () => ({
        user: { id: 'u1' },
        tenant: { id: 't1' },
        membership: { id: 'm1' },
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    vi.doMock('@/platform/db/tenant-context', () => ({
      withTenant: vi.fn().mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        code: 'BRD1',
        name: 'Bread',
        barcode: '4006381333931',
      }),
    }));
    const { GET } = await import('./route');
    const res = await GET(new Request('https://x/api/mobile/products/by-barcode?barcode=4006381333931'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      id: '00000000-0000-0000-0000-000000000001',
      code: 'BRD1',
      name: 'Bread',
      barcode: '4006381333931',
    });
  });
});
