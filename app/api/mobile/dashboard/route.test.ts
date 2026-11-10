import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  resolveContext: vi.fn(),
}));
vi.mock('@/platform/engine/dashboard-queries', () => ({
  accountsReceivableTotal: vi
    .fn()
    .mockResolvedValue({ current: 1000, previous: 800, delta: 25 }),
  accountsPayableTotal: vi
    .fn()
    .mockResolvedValue({ current: 500, previous: 600, delta: -16.67 }),
  thisMonthSalesTotal: vi
    .fn()
    .mockResolvedValue({ current: 3000, previous: 2500, delta: 20 }),
  openInvoiceCount: vi
    .fn()
    .mockResolvedValue({ current: 7, previous: 5, delta: 40 }),
  upcomingReceivables: vi.fn().mockResolvedValue([
    { id: 'c1', name: 'ACME', amount: 250, date: '2026-05-01' },
  ]),
  upcomingPayables: vi.fn().mockResolvedValue([
    { id: 's1', name: 'Supplier', amount: 150, date: '2026-05-02' },
  ]),
  recentActivity: vi.fn().mockResolvedValue([
    {
      id: 'a1',
      kind: 'posted',
      label: '#INV-001',
      href: '/documents/sales.invoice/d1',
      timestamp: '2026-04-28T10:00:00.000Z',
    },
  ]),
  lowStockCount: vi.fn().mockResolvedValue({ count: 2, threshold: 5 }),
  last30DaysTrend: vi.fn().mockResolvedValue([
    { date: '2026-04-01', sales: 100, collections: 80 },
  ]),
}));

import { GET } from './route';

describe('GET /api/mobile/dashboard', () => {
  it('returns 401 when unauthenticated', async () => {
    const { resolveContext } = await import('@/platform/auth/current-context');
    (resolveContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns tenant=null when user has no tenant', async () => {
    const { resolveContext } = await import('@/platform/auth/current-context');
    (resolveContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      tenant: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenant).toBeNull();
    expect(body.layout).toEqual([]);
  });

  it('returns slot/widget layout shape', async () => {
    const { resolveContext } = await import('@/platform/auth/current-context');
    (resolveContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      tenant: { id: 't1', currency: 'USD' },
      permissions: new Set(['*:*']),
      membership: { roles: [{ name: 'owner' }] },
      scopesByEntity: new Map(),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenant).toEqual({ id: 't1', currency: 'USD' });
    expect(Array.isArray(body.layout)).toBe(true);

    // Find hero slot
    const hero = body.layout.find((s: { slot: string }) => s.slot === 'hero');
    expect(hero).toBeDefined();
    expect(hero.widgets.some((w: { id: string }) => w.id === 'kpi.receivables')).toBe(true);

    // Find actions slot
    const actions = body.layout.find((s: { slot: string }) => s.slot === 'actions');
    expect(actions).toBeDefined();
    expect(actions.widgets.some((w: { id: string }) => w.id === 'action.upcomingReceivables')).toBe(true);

    // Each widget has type + data
    for (const slot of body.layout) {
      for (const widget of slot.widgets) {
        expect(widget).toHaveProperty('id');
        expect(widget).toHaveProperty('type');
        expect(widget).toHaveProperty('data');
      }
    }
  });
});
