import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.MOBILE_JWT_SECRET = 'a'.repeat(48);
  process.env.R2_ACCOUNT_ID = 'test';
  process.env.R2_ACCESS_KEY_ID = 'AKIA';
  process.env.R2_SECRET_ACCESS_KEY = 'secret';
  process.env.R2_BUCKET = 'bucket';
});

beforeEach(() => {
  vi.resetModules();
});

describe('GET /api/mobile/attachments/[id]', () => {
  it('returns 401 when no context', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      requireTenantContext: async () => { throw new Error('UNAUTHENTICATED'); },
    }));
    const { GET } = await import('./route');
    const res = await GET(new Request('https://x/api/mobile/attachments/1'), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when attachment not found', async () => {
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
    const res = await GET(new Request('https://x/api/mobile/attachments/1'), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 with signed download URL', async () => {
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
        filename: 'test.pdf',
        contentType: 'application/pdf',
        size: 1024,
        objectKey: 'key',
        createdAt: new Date('2026-01-01'),
      }),
    }));
    vi.doMock('@/lib/r2', () => ({
      signGetUrl: vi.fn().mockResolvedValue('https://r2.example.com/get'),
      deleteObject: vi.fn().mockResolvedValue(undefined),
    }));
    const { GET } = await import('./route');
    const res = await GET(new Request('https://x/api/mobile/attachments/1'), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.downloadUrl).toBe('https://r2.example.com/get');
    expect(body.filename).toBe('test.pdf');
  });
});

describe('DELETE /api/mobile/attachments/[id]', () => {
  it('returns 401 when no context', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      requireTenantContext: async () => { throw new Error('UNAUTHENTICATED'); },
    }));
    const { DELETE } = await import('./route');
    const res = await DELETE(new Request('https://x/api/mobile/attachments/1'), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 204 and deletes attachment', async () => {
    vi.doMock('@/platform/auth/current-context', () => ({
      requireTenantContext: async () => ({
        user: { id: 'u1' },
        tenant: { id: 't1' },
        membership: { id: 'm1' },
        permissions: new Set<string>(),
        scopesByEntity: new Map(),
      }),
    }));
    const updateMock = vi.fn().mockResolvedValue({});
    vi.doMock('@/platform/db/tenant-context', () => ({
      withTenant: vi.fn().mockImplementation(async (_tenantId: string, fn: Function) => {
        const result = await fn({
          attachment: {
            findFirst: vi.fn().mockResolvedValue({
              id: '00000000-0000-0000-0000-000000000001',
              objectKey: 'key',
            }),
            update: updateMock,
          },
        });
        return result;
      }),
    }));
    vi.doMock('@/lib/r2', () => ({
      deleteObject: vi.fn().mockResolvedValue(undefined),
    }));
    const { DELETE } = await import('./route');
    const res = await DELETE(new Request('https://x/api/mobile/attachments/1'), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(204);
  });
});
