import { POST } from './route';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn(),
}));
vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: vi.fn(),
}));
vi.mock('@/lib/r2', () => ({
  buildObjectKey: vi.fn().mockReturnValue('key'),
  signPutUrl: vi.fn().mockResolvedValue('https://put'),
  signGetUrl: vi.fn().mockResolvedValue('https://get'),
}));
vi.mock('@/platform/engine/attachments', () => ({
  assertEntityAccess: vi.fn(),
}));
vi.mock('@/platform/billing/enforce', () => ({
  enforcePlanLimit: vi.fn(),
}));

import { requireTenantContext } from '@/platform/auth/current-context';
import { enforcePlanLimit } from '@/platform/billing/enforce';
import { withTenant } from '@/platform/db/tenant-context';
import { assertEntityAccess } from '@/platform/engine/attachments';

beforeEach(() => vi.clearAllMocks());

const VALID_BODY = {
  fileName: 'test.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  entity: 'document.purchases.invoice',
  entityId: '00000000-0000-0000-0000-000000000001',
};

describe('POST /api/mobile/attachments/upload', () => {
  it('returns 401 when requireTenantContext rejects', async () => {
    (requireTenantContext as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('UNAUTHENTICATED'),
    );

    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify(VALID_BODY),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body fails schema parse', async () => {
    (requireTenantContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenant: { id: 't1' },
      user: { id: 'u1' },
      permissions: [],
    });

    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 200 with signed URLs on valid request when assertEntityAccess passes', async () => {
    (requireTenantContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenant: { id: 't1' },
      user: { id: 'u1' },
      permissions: ['purchases.invoice:write'],
    });
    (assertEntityAccess as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    (withTenant as ReturnType<typeof vi.fn>).mockImplementation(async (_id, fn) =>
      fn({ attachment: { create: vi.fn().mockResolvedValue({ id: 'att-1' }) } }),
    );

    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify(VALID_BODY),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attachmentId).toBeDefined();
    expect(body.uploadUrl).toBe('https://put');
    expect(body.downloadUrl).toBe('https://get');
  });

  it('returns 402 with PlanLimitError body when storage cap is hit', async () => {
    (requireTenantContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenant: { id: 't1', plan: 'free' },
      user: { id: 'u1' },
      permissions: ['purchases.invoice:write'],
    });
    (assertEntityAccess as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const { PlanLimitError } = await import('@/platform/engine/errors');
    (enforcePlanLimit as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new PlanLimitError('storage_bytes', 1024, 1024, 'starter'),
    );

    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify(VALID_BODY),
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body).toMatchObject({
      error: 'plan_limit_exceeded',
      kind: 'storage_bytes',
      current: 1024,
      allowed: 1024,
      upgradeTo: 'starter',
    });
    // withTenant must not be called — guard fires before DB write.
    expect(withTenant).not.toHaveBeenCalled();
  });

  it('rejects with 403 when assertEntityAccess throws PermissionDeniedError', async () => {
    (requireTenantContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenant: { id: 't1' },
      user: { id: 'u1' },
      permissions: [],
    });
    const { PermissionDeniedError } = await import('@/platform/engine/errors');
    (assertEntityAccess as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new PermissionDeniedError('document.purchases.invoice', 'write');
    });

    const body = JSON.stringify({
      fileName: 'a.jpg',
      mimeType: 'image/jpeg',
      size: 1000,
      entity: 'document.purchases.invoice',
      entityId: '00000000-0000-0000-0000-000000000001',
    });
    const res = await POST(
      new Request('http://localhost', { method: 'POST', body, headers: { 'content-type': 'application/json' } }),
    );
    expect(res.status).toBe(403);
    expect(assertEntityAccess).toHaveBeenCalledWith(
      expect.anything(),
      'document.purchases.invoice',
      'write',
    );
  });
});
