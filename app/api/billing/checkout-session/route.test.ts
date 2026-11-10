import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolveContext = vi.hoisted(() => vi.fn());
const mockCreateCheckout = vi.hoisted(() => vi.fn());
const mockWithBypass = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', () => ({
  resolveContext: mockResolveContext,
}));

vi.mock('@/platform/billing/create-checkout', () => ({
  createCheckoutSession: mockCreateCheckout,
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

import { POST } from './route';

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/billing/checkout-session', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const OWNER_PERMS = new Set(['admin.billing:manage']);

const TENANT_FIXTURE = {
  id: 't1',
  name: 'Acme',
  slug: 'acme',
  currency: 'USD',
  stripeCustomerId: null,
  trialEndsAt: null,
};

describe('POST /api/billing/checkout-session', () => {
  beforeEach(() => {
    mockResolveContext.mockReset();
    mockCreateCheckout.mockReset();
    mockWithBypass.mockReset();
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        tenant: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(TENANT_FIXTURE),
        },
      }),
    );
    mockCreateCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/c/sess_abc' });
  });

  it('401 when unauthenticated', async () => {
    mockResolveContext.mockResolvedValue(null);
    const res = await POST(makeReq({ plan: 'pro', interval: 'month' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(mockCreateCheckout).not.toHaveBeenCalled();
  });

  it('403 when user has no tenant', async () => {
    mockResolveContext.mockResolvedValue({
      user: { id: 'u1' },
      tenant: null,
      membership: null,
      permissions: new Set(),
      scopesByEntity: new Map(),
    });
    const res = await POST(makeReq({ plan: 'pro', interval: 'month' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'no_tenant' });
    expect(mockCreateCheckout).not.toHaveBeenCalled();
  });

  it('403 when caller lacks admin.billing:manage', async () => {
    mockResolveContext.mockResolvedValue({
      user: { id: 'u1' },
      tenant: { id: 't1', name: 'Acme', currency: 'USD' },
      membership: { id: 'm1' },
      permissions: new Set(['catalog.product:read']),
      scopesByEntity: new Map(),
    });
    const res = await POST(makeReq({ plan: 'pro', interval: 'month' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden' });
    expect(mockCreateCheckout).not.toHaveBeenCalled();
  });

  it('400 on malformed body', async () => {
    mockResolveContext.mockResolvedValue({
      user: { id: 'u1' },
      tenant: { id: 't1', name: 'Acme', currency: 'USD' },
      membership: { id: 'm1' },
      permissions: OWNER_PERMS,
      scopesByEntity: new Map(),
    });
    const res = await POST(makeReq({ plan: 'invalid' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad_request' });
    expect(mockCreateCheckout).not.toHaveBeenCalled();
  });

  it('400 when body is empty / not JSON', async () => {
    mockResolveContext.mockResolvedValue({
      user: { id: 'u1' },
      tenant: { id: 't1', name: 'Acme', currency: 'USD' },
      membership: { id: 'm1' },
      permissions: OWNER_PERMS,
      scopesByEntity: new Map(),
    });
    const res = await POST(makeReq(undefined));
    expect(res.status).toBe(400);
  });

  it('200 + checkout URL on happy path', async () => {
    mockResolveContext.mockResolvedValue({
      user: { id: 'u1' },
      tenant: { id: 't1', name: 'Acme', currency: 'USD' },
      membership: { id: 'm1' },
      permissions: OWNER_PERMS,
      scopesByEntity: new Map(),
    });

    const res = await POST(makeReq({ plan: 'pro', interval: 'month' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/sess_abc' });

    expect(mockCreateCheckout).toHaveBeenCalledTimes(1);
    const arg = mockCreateCheckout.mock.calls[0]?.[0];
    expect(arg.plan).toBe('pro');
    expect(arg.interval).toBe('month');
    expect(arg.tenant).toEqual(TENANT_FIXTURE);
    expect(arg.successUrl).toBe('http://localhost:3000/settings/billing?session=success');
    expect(arg.cancelUrl).toBe('http://localhost:3000/settings/billing?session=canceled');
  });

  it('accepts business + year', async () => {
    mockResolveContext.mockResolvedValue({
      user: { id: 'u1' },
      tenant: { id: 't1', name: 'Acme', currency: 'USD' },
      membership: { id: 'm1' },
      permissions: OWNER_PERMS,
      scopesByEntity: new Map(),
    });

    const res = await POST(makeReq({ plan: 'business', interval: 'year' }));
    expect(res.status).toBe(200);
    expect(mockCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'business', interval: 'year' }),
    );
  });
});
