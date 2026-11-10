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

const mockCustomer = {
  id: 'c1',
  code: 'C-001',
  name: 'Acme Corp',
  phone: '+1-555-0100',
  email: 'acme@example.com',
  address: '123 Main St',
};

describe('GET /api/mobile/customer-360/[id]', () => {
  beforeEach(() => {
    mockWithTenant.mockReset();
  });

  it('returns 401 without tenant context', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('UNAUTH'));
    const res = await GET(new Request('http://localhost/api/mobile/customer-360/c1'), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown customer', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tenant: mockTenant });
    mockWithTenant.mockImplementation(async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        catalog_sales_customer: {
          findUnique: async () => null,
        },
      };
      return fn(tx);
    });
    const res = await GET(new Request('http://localhost/api/mobile/customer-360/unknown'), { params: Promise.resolve({ id: 'unknown' }) });
    expect(res.status).toBe(404);
  });

  it('returns aggregated customer 360 payload', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tenant: mockTenant });

    mockWithTenant.mockImplementation(async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        catalog_sales_customer: {
          findUnique: async () => mockCustomer,
        },
        movement_sales_accounts_receivable: {
          findMany: async () => [
            { kind: 'income', amount: '1000', timestamp: new Date('2026-04-01T00:00:00Z'), customer: 'c1' },
            { kind: 'expense', amount: '200', timestamp: new Date('2026-04-15T00:00:00Z'), customer: 'c1' },
          ],
        },
        document_sales_invoice: {
          findMany: async () => [
            { id: 'inv1', number: 'INV-001', date: new Date('2026-04-20'), status: 'POSTED', postedAt: new Date('2026-04-20') },
          ],
        },
        documentLine_sales_invoice_items: {
          findMany: async () => [
            { documentId: 'inv1', total: '500' },
          ],
        },
        document_sales_payment_received: {
          findMany: async () => [
            { id: 'pay1', number: 'PAY-001', date: new Date('2026-04-21'), amount: '200', status: 'POSTED', postedAt: new Date('2026-04-21') },
          ],
        },
      };
      return fn(tx);
    });

    const res = await GET(new Request('http://localhost/api/mobile/customer-360/c1'), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customer.id).toBe('c1');
    expect(body.customer.name).toBe('Acme Corp');
    expect(body.balance).toBe(800);
    expect(body.currency).toBe('USD');
    expect(body.invoices).toHaveLength(1);
    expect(body.invoices[0].number).toBe('INV-001');
    expect(body.payments).toHaveLength(1);
    expect(body.payments[0].amount).toBe(200);
    expect(body.stockOuts).toEqual([]);
    expect(body.balanceTrend).toBeDefined();
    expect(Array.isArray(body.balanceTrend)).toBe(true);
  });
});
