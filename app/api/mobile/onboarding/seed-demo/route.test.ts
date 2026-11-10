import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolveContext = vi.hoisted(() => vi.fn());
const mockSeedDemo = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/auth/current-context')>();
  return {
    ...actual,
    resolveContext: mockResolveContext,
  };
});

vi.mock('@/prisma/seed/runner', () => ({
  seedDemo: mockSeedDemo,
}));

import { POST } from './route';

interface CtxOptions {
  tenantId?: string | null;
  roles?: Array<{ name: string }>;
}

function makeCtx({ tenantId = randomUUID(), roles = [{ name: 'owner' }] }: CtxOptions = {}) {
  return {
    user: { id: randomUUID(), clerkId: `user_${randomUUID().replace(/-/g, '')}` },
    tenant: tenantId ? { id: tenantId } : null,
    membership: tenantId ? { id: randomUUID(), roles } : null,
    permissions: new Set<string>(),
    scopesByEntity: new Map(),
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/mobile/onboarding/seed-demo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function defaultSeedResult() {
  return {
    customers: 20,
    products: 50,
    invoices: { posted: 25, drafts: 5 },
    payments: { posted: 4, drafts: 1 },
    suppliers: 8,
    purchaseInvoices: { posted: 8, drafts: 2 },
    paymentsSent: { posted: 4, drafts: 1 },
  };
}

beforeEach(() => {
  mockResolveContext.mockReset();
  mockSeedDemo.mockReset();
});

describe('POST /api/mobile/onboarding/seed-demo', () => {
  it('returns 401 when no auth context', async () => {
    mockResolveContext.mockResolvedValue(null);

    const res = await POST(makeRequest({ tenantId: randomUUID() }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
    expect(mockSeedDemo).not.toHaveBeenCalled();
  });

  it('returns 403 when caller has no tenant', async () => {
    mockResolveContext.mockResolvedValue(makeCtx({ tenantId: null }));

    const res = await POST(makeRequest({ tenantId: randomUUID() }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
    expect(mockSeedDemo).not.toHaveBeenCalled();
  });

  it('returns 400 on malformed body (missing tenantId)', async () => {
    mockResolveContext.mockResolvedValue(makeCtx());

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('bad_request');
    expect(mockSeedDemo).not.toHaveBeenCalled();
  });

  it('returns 400 on non-uuid tenantId', async () => {
    mockResolveContext.mockResolvedValue(makeCtx());

    const res = await POST(makeRequest({ tenantId: 'not-a-uuid' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('bad_request');
    expect(mockSeedDemo).not.toHaveBeenCalled();
  });

  it('returns 403 when body.tenantId mismatches ctx.tenant.id', async () => {
    mockResolveContext.mockResolvedValue(makeCtx({ tenantId: randomUUID() }));

    const res = await POST(makeRequest({ tenantId: randomUUID() }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
    expect(mockSeedDemo).not.toHaveBeenCalled();
  });

  it('returns 403 when caller is a bookkeeper (not owner)', async () => {
    const tenantId = randomUUID();
    mockResolveContext.mockResolvedValue(
      makeCtx({ tenantId, roles: [{ name: 'bookkeeper' }] }),
    );

    const res = await POST(makeRequest({ tenantId }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
    expect(mockSeedDemo).not.toHaveBeenCalled();
  });

  it('returns 403 when caller is a viewer (not owner)', async () => {
    const tenantId = randomUUID();
    mockResolveContext.mockResolvedValue(makeCtx({ tenantId, roles: [{ name: 'viewer' }] }));

    const res = await POST(makeRequest({ tenantId }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
    expect(mockSeedDemo).not.toHaveBeenCalled();
  });

  it('returns 200 with mapped summary on owner happy path', async () => {
    const tenantId = randomUUID();
    mockResolveContext.mockResolvedValue(makeCtx({ tenantId }));
    mockSeedDemo.mockResolvedValue(defaultSeedResult());

    const res = await POST(makeRequest({ tenantId }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.summary.customers).toBe(20);
    expect(body.summary.products).toBe(50);
    // documents = invoices(25+5) + payments(4+1) + purchaseInvoices(8+2) + paymentsSent(4+1) = 50
    expect(body.summary.documents).toBe(50);
    expect(Number.isInteger(body.summary.customers)).toBe(true);
    expect(Number.isInteger(body.summary.products)).toBe(true);
    expect(Number.isInteger(body.summary.documents)).toBe(true);
    expect(body.summary.customers).toBeGreaterThanOrEqual(0);
    expect(body.summary.products).toBeGreaterThanOrEqual(0);
    expect(body.summary.documents).toBeGreaterThanOrEqual(0);
    expect(mockSeedDemo).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — two consecutive calls both return 200 with the same summary', async () => {
    const tenantId = randomUUID();
    mockResolveContext.mockResolvedValue(makeCtx({ tenantId }));
    // seedDemo is idempotent per its own contract — re-running on a populated
    // tenant returns the same SeedDemoResult shape. Simulate that by returning
    // the same object on both invocations.
    mockSeedDemo.mockResolvedValue(defaultSeedResult());

    const res1 = await POST(makeRequest({ tenantId }));
    const res2 = await POST(makeRequest({ tenantId }));

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    const body1 = await res1.json();
    const body2 = await res2.json();
    expect(body1).toEqual(body2);
    expect(mockSeedDemo).toHaveBeenCalledTimes(2);
  });
});
