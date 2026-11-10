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

describe('GET /api/mobile/widget/ar', () => {
  beforeEach(() => {
    mockWithTenant.mockReset();
  });

  it('returns 401 without tenant context', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('UNAUTH'));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns total open AR and top 3 overdue', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tenant: mockTenant });

    mockWithTenant.mockImplementation(async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        movement_sales_accounts_receivable: {
          findMany: async () => [
            { kind: 'income', amount: '5000', customer: 'c1' },
            { kind: 'expense', amount: '1000', customer: 'c1' },
            { kind: 'income', amount: '3000', customer: 'c2' },
          ],
        },
        document_sales_invoice: {
          findMany: async () => [
            { id: 'inv1', customer: 'c1', date: new Date('2026-03-01'), number: 'INV-001' },
            { id: 'inv2', customer: 'c2', date: new Date('2026-03-15'), number: 'INV-002' },
          ],
        },
        catalog_sales_customer: {
          findMany: async () => [
            { id: 'c1', name: 'Acme Corp' },
            { id: 'c2', name: 'Beta Ltd' },
          ],
        },
      };
      return fn(tx);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalOpenAR).toBe(7000);
    expect(body.currency).toBe('USD');
    expect(body.top3Overdue).toHaveLength(2);
    expect(body.top3Overdue[0].counterpartyName).toBe('Acme Corp');
    expect(body.top3Overdue[0].amount).toBe(4000);
    expect(body.top3Overdue[0].daysOverdue).toBeGreaterThan(0);
  });
});
