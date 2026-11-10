import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolveContext = vi.hoisted(() => vi.fn());
const mockWithBypass = vi.hoisted(() => vi.fn());
const mockCreatePortalSession = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', () => ({
  resolveContext: mockResolveContext,
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

vi.mock('@/platform/billing/create-portal', () => ({
  createPortalSession: mockCreatePortalSession,
}));

import { POST } from './route';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/billing/portal-session', { method: 'POST' });
}

function ctxFixture(
  overrides: {
    tenant?: { id: string; stripeCustomerId?: string | null } | null;
    roles?: Array<{ name: string }>;
  } = {},
): unknown {
  const tenant =
    overrides.tenant === undefined ? { id: 't-1', stripeCustomerId: 'cus_x' } : overrides.tenant;
  return {
    user: { id: 'u-1' },
    tenant,
    membership: overrides.roles === undefined ? null : { roles: overrides.roles },
    permissions: new Set<string>(),
    scopesByEntity: new Map(),
  };
}

beforeEach(() => {
  mockResolveContext.mockReset();
  mockWithBypass.mockReset();
  mockCreatePortalSession.mockReset();
});

describe('POST /api/billing/portal-session', () => {
  it('returns 401 when not authenticated', async () => {
    mockResolveContext.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(mockWithBypass).not.toHaveBeenCalled();
    expect(mockCreatePortalSession).not.toHaveBeenCalled();
  });

  it('returns 403 when ctx has no tenant', async () => {
    mockResolveContext.mockResolvedValue(ctxFixture({ tenant: null }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'no_tenant' });
    expect(mockWithBypass).not.toHaveBeenCalled();
  });

  it('returns 403 when caller is not owner', async () => {
    mockResolveContext.mockResolvedValue(
      ctxFixture({
        tenant: { id: 't-1', stripeCustomerId: 'cus_x' },
        roles: [{ name: 'admin' }, { name: 'cashier' }],
      }),
    );
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden' });
    expect(mockWithBypass).not.toHaveBeenCalled();
  });

  it('returns 400 when tenant has no stripeCustomerId', async () => {
    mockResolveContext.mockResolvedValue(
      ctxFixture({ tenant: { id: 't-1' }, roles: [{ name: 'owner' }] }),
    );
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        tenant: {
          findUniqueOrThrow: async () => ({ id: 't-1', stripeCustomerId: null }),
        },
      }),
    );
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'no_customer',
      message: 'Upgrade to a paid plan first',
    });
    expect(mockCreatePortalSession).not.toHaveBeenCalled();
  });

  it('returns 200 with portal session url on the happy path', async () => {
    mockResolveContext.mockResolvedValue(
      ctxFixture({
        tenant: { id: 't-1', stripeCustomerId: 'cus_x' },
        roles: [{ name: 'owner' }],
      }),
    );
    const dbTenant = { id: 't-1', stripeCustomerId: 'cus_x' };
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        tenant: {
          findUniqueOrThrow: async () => dbTenant,
        },
      }),
    );
    mockCreatePortalSession.mockResolvedValue({ url: 'https://billing.stripe.com/p/session/xyz' });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://billing.stripe.com/p/session/xyz' });
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      tenant: dbTenant,
      returnUrl: 'http://localhost:3000/settings/billing',
    });
  });
});
