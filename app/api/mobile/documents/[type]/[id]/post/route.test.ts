import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  postDocument: vi.fn(),
  resolveIdempotency: vi.fn(),
  storeIdempotency: vi.fn(),
}));

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: async () => ({
    tenant: { id: 'test-tenant', plan: 'free' },
    user: { id: 'test-user' },
    permissions: new Set(['sales.invoice:write', 'sales.invoice:post']),
  }),
}));

vi.mock('@/platform/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/engine')>();
  return {
    ...actual,
    postDocument: mocks.postDocument,
    resolveIdempotency: mocks.resolveIdempotency,
    storeIdempotency: mocks.storeIdempotency,
  };
});

import { PlanLimitError } from '@/platform/engine/errors';
import { POST } from './route';

describe('POST /api/mobile/documents/[type]/[id]/post', () => {
  it('returns 402 with PlanLimitError JSON body when posting hits the cap', async () => {
    mocks.resolveIdempotency.mockResolvedValueOnce(null);
    mocks.postDocument.mockRejectedValueOnce(
      new PlanLimitError('monthly_posted_docs', 25, 25, 'starter'),
    );

    const res = await POST(
      new Request('http://localhost/api/mobile/documents/sales.invoice/doc-1/post', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'k-1' },
      }),
      { params: Promise.resolve({ type: 'sales.invoice', id: 'doc-1' }) },
    );

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body).toMatchObject({
      error: 'plan_limit_exceeded',
      kind: 'monthly_posted_docs',
      current: 25,
      allowed: 25,
      upgradeTo: 'starter',
    });
    expect(mocks.storeIdempotency).not.toHaveBeenCalled();
  });
});
