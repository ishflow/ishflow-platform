import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn(),
}));
vi.mock('@/lib/reports/summary', () => ({
  computeSummary: vi.fn(),
}));

const { requireTenantContext } = await import('@/platform/auth/current-context');
const { computeSummary } = await import('@/lib/reports/summary');
const { GET } = await import('./route');

const ownerCtx = {
  tenant: { id: 't1', currency: 'USD' },
  user: { id: 'u1' },
  membership: { id: 'm1' },
  permissions: new Set(['*:*', 'reports:read']),
  scopesByEntity: new Map(),
} as never;
const salesCtx = {
  tenant: { id: 't1', currency: 'USD' },
  user: { id: 'u1' },
  membership: { id: 'm1' },
  permissions: new Set(['sales.invoice:write', '*:read']),
  scopesByEntity: new Map(),
} as never;

describe('GET /api/mobile/reports/[type]/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (computeSummary as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      type: 'ar-aging',
      period: { from: '2026-05-01', to: '2026-05-11', label: 'this-month' },
      currency: 'USD',
      hero: { value: 100, deltaPct: null, deltaSign: 'flat' },
      breakdown: [],
    });
  });

  it('returns 200 + summary for owner', async () => {
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(ownerCtx);
    const req = new NextRequest('http://x/api/mobile/reports/ar-aging/summary?period=this-month');
    const res = await GET(req, { params: Promise.resolve({ type: 'ar-aging' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('ar-aging');
  });

  it('returns 403 for role without reports:read', async () => {
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(salesCtx);
    const req = new NextRequest('http://x/api/mobile/reports/ar-aging/summary?period=this-month');
    const res = await GET(req, { params: Promise.resolve({ type: 'ar-aging' }) });
    expect(res.status).toBe(403);
  });

  it('returns 400 for unknown period', async () => {
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(ownerCtx);
    const req = new NextRequest('http://x/api/mobile/reports/ar-aging/summary?period=forever');
    const res = await GET(req, { params: Promise.resolve({ type: 'ar-aging' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown type', async () => {
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(ownerCtx);
    const req = new NextRequest('http://x/api/mobile/reports/nope/summary?period=this-month');
    const res = await GET(req, { params: Promise.resolve({ type: 'nope' }) });
    expect(res.status).toBe(404);
  });
});
