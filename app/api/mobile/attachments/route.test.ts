import { GET } from './route';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn(),
}));
vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: vi.fn(),
}));
vi.mock('@/lib/r2', () => ({
  signGetUrl: vi.fn(),
}));
vi.mock('@/platform/engine/attachments', () => ({
  assertEntityAccess: vi.fn(),
}));

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { signGetUrl } from '@/lib/r2';
import { assertEntityAccess } from '@/platform/engine/attachments';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/mobile/attachments', () => {
  it('returns 401 when unauthenticated', async () => {
    (requireTenantContext as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no tenant'));
    const url = 'http://localhost/api/mobile/attachments?entity=document.purchases.invoice&entityId=00000000-0000-0000-0000-000000000001';
    const res = await GET(new Request(url));
    expect(res.status).toBe(401);
  });

  it('returns 400 on missing entity', async () => {
    (requireTenantContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenant: { id: 't1' },
      permissions: [],
    });
    const url = 'http://localhost/api/mobile/attachments?entityId=00000000-0000-0000-0000-000000000001';
    const res = await GET(new Request(url));
    expect(res.status).toBe(400);
  });

  it('returns items with signed download URLs', async () => {
    (requireTenantContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenant: { id: 't1' },
      permissions: ['purchases.invoice:read'],
    });
    (assertEntityAccess as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    (withTenant as ReturnType<typeof vi.fn>).mockImplementation(async (_id, fn) =>
      fn({
        attachment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'a1',
              filename: 'scan.pdf',
              contentType: 'application/pdf',
              size: 1234,
              objectKey: 'tenants/t1/scan.pdf',
              createdAt: new Date('2026-05-03T10:00:00Z'),
            },
          ]),
        },
      }),
    );
    (signGetUrl as ReturnType<typeof vi.fn>).mockResolvedValue('https://r2.example/signed');

    const url = 'http://localhost/api/mobile/attachments?entity=document.purchases.invoice&entityId=00000000-0000-0000-0000-000000000001';
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].downloadUrl).toBe('https://r2.example/signed');
    expect(body.items[0].id).toBe('a1');
    expect(assertEntityAccess).toHaveBeenCalledWith(
      expect.anything(),
      'document.purchases.invoice',
      'read',
    );
  });

  it('returns 403 when assertEntityAccess throws', async () => {
    (requireTenantContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenant: { id: 't1' },
      permissions: [],
    });
    const { PermissionDeniedError } = await import('@/platform/engine/errors');
    (assertEntityAccess as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new PermissionDeniedError('document.purchases.invoice', 'read');
    });
    const url = 'http://localhost/api/mobile/attachments?entity=document.purchases.invoice&entityId=00000000-0000-0000-0000-000000000001';
    const res = await GET(new Request(url));
    expect(res.status).toBe(403);
  });
});
