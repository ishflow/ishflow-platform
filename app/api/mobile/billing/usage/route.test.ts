import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  resolveContext: vi.fn(),
}));
vi.mock('@/platform/billing/usage', () => ({
  getUsage: vi.fn(),
}));
vi.mock('@/platform/billing/effective-limits', () => ({
  effectiveLimits: vi.fn(),
}));

import { GET } from './route';

describe('GET /api/mobile/billing/usage', () => {
  it('returns 401 when unauthenticated', async () => {
    const { resolveContext } = await import('@/platform/auth/current-context');
    (resolveContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });

  it('returns 403 when user has no tenant', async () => {
    const { resolveContext } = await import('@/platform/auth/current-context');
    (resolveContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      tenant: null,
    });
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('no_tenant');
  });

  it('returns usage + limits + plan on 200', async () => {
    const { resolveContext } = await import('@/platform/auth/current-context');
    const { getUsage } = await import('@/platform/billing/usage');
    const { effectiveLimits } = await import('@/platform/billing/effective-limits');
    (resolveContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      tenant: { id: 't1', plan: 'STARTER', status: 'active', trialEndsAt: null },
    });
    (getUsage as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      members: 3,
      monthlyPostedDocs: 42,
      storageBytes: 1024,
      savedViews: 7,
    });
    (effectiveLimits as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      members: 5,
      monthlyPostedDocs: 100,
      storageBytes: 10000,
      savedViews: 20,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan).toBe('STARTER');
    expect(body.usage).toEqual({
      members: 3,
      monthlyPostedDocs: 42,
      storageBytes: 1024,
      savedViews: 7,
    });
    expect(body.limits).toEqual({
      members: 5,
      monthlyPostedDocs: 100,
      storageBytes: 10000,
      savedViews: 20,
    });
    expect(getUsage).toHaveBeenCalledWith('t1');
    expect(effectiveLimits).toHaveBeenCalledWith({
      id: 't1',
      plan: 'STARTER',
      status: 'active',
      trialEndsAt: null,
    });
  });
});
