import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn(),
}));

const mockWithTenant = vi.fn();
vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: async <T, _C>(tenantId: string, fn: (tx: unknown) => Promise<T>) => mockWithTenant(tenantId, fn),
}));

import { GET } from './route';

const mockTenant = {
  id: 't1',
  currency: 'USD',
};

describe('GET /api/mobile/widget/today', () => {
  beforeEach(() => {
    mockWithTenant.mockReset();
  });

  it('returns 401 without tenant context', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('UNAUTH'));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns today sales count and total', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tenant: mockTenant });

    mockWithTenant.mockImplementation(async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        document_sales_invoice: {
          findMany: async () => [
            { id: 'inv1' },
            { id: 'inv2' },
          ],
        },
        movement_sales_sale: {
          aggregate: async () => ({ _sum: { revenue: '3500.50' } }),
        },
      };
      return fn(tx);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.salesCount).toBe(2);
    expect(body.totalSales).toBe(3500.5);
    expect(body.currency).toBe('USD');
  });
});
