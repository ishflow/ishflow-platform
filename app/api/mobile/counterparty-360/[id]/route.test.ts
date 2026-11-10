import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn(),
}));

const mockWithTenant = vi.fn();
vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: async <T, _C>(tenantId: string, fn: (tx: unknown) => Promise<T>) => mockWithTenant(tenantId, fn),
}));

import { GET } from './route';

const mockTenant = { id: 't1', currency: 'USD' };

describe('GET /api/mobile/counterparty-360/[id]', () => {
  beforeEach(() => {
    mockWithTenant.mockReset();
  });

  it('returns 401 without tenant context', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('UNAUTH'));
    const res = await GET(new Request('http://localhost/api/mobile/counterparty-360/c1?type=customer'), {
      params: Promise.resolve({ id: 'c1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown customer', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tenant: mockTenant });
    mockWithTenant.mockImplementation(async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        catalog_sales_customer: { findUnique: async () => null },
      }),
    );
    const res = await GET(new Request('http://localhost/api/mobile/counterparty-360/unknown?type=customer'), {
      params: Promise.resolve({ id: 'unknown' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns aggregated customer payload when type=customer', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tenant: mockTenant });
    mockWithTenant.mockImplementation(async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        catalog_sales_customer: {
          findUnique: async () => ({
            id: 'c1', name: 'Acme', phone: '+1', email: 'a@b',
          }),
        },
        movement_sales_accounts_receivable: {
          findMany: async () => [
            { kind: 'income', amount: '1000', timestamp: new Date('2026-04-01T00:00:00Z') },
            { kind: 'expense', amount: '200', timestamp: new Date('2026-04-15T00:00:00Z') },
          ],
        },
        document_sales_invoice: {
          findMany: async () => [{ id: 'i1', number: 'INV-1', date: new Date('2026-04-20'), status: 'POSTED', postedAt: new Date('2026-04-20') }],
        },
        documentLine_sales_invoice_items: {
          findMany: async () => [{ documentId: 'i1', quantity: 5, price: '100' }],
        },
        document_sales_payment_received: {
          findMany: async () => [{ id: 'p1', number: 'PAY-1', date: new Date('2026-04-21'), amount: '200', status: 'POSTED', postedAt: new Date('2026-04-21') }],
        },
      }),
    );
    const res = await GET(new Request('http://localhost/api/mobile/counterparty-360/c1?type=customer'), {
      params: Promise.resolve({ id: 'c1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('customer');
    expect(body.counterparty.name).toBe('Acme');
    expect(body.counterparty.code).toBeNull();
    expect(body.counterparty.address).toBeNull();
    expect(body.balance).toBe(800);
    expect(body.invoices).toHaveLength(1);
    expect(body.invoices[0].total).toBe(500);
    expect(body.payments[0].amount).toBe(200);
  });

  it('returns aggregated supplier payload when type=supplier', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tenant: mockTenant });
    mockWithTenant.mockImplementation(async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        catalog_purchases_supplier: {
          findUnique: async () => ({ id: 's1', name: 'WidgetCo', phone: '+90', email: 'w@co' }),
        },
        movement_purchases_accounts_payable: {
          findMany: async () => [
            { kind: 'income', amount: '2000', timestamp: new Date('2026-04-01T00:00:00Z') },
            { kind: 'expense', amount: '500', timestamp: new Date('2026-04-15T00:00:00Z') },
          ],
        },
        document_purchases_invoice: {
          findMany: async () => [{ id: 'pi1', number: 'PI-1', date: new Date('2026-04-22'), status: 'POSTED', postedAt: new Date('2026-04-22') }],
        },
        documentLine_purchases_invoice_items: {
          findMany: async () => [{ documentId: 'pi1', quantity: 5, price: '100' }],
        },
        document_purchases_payment_sent: {
          findMany: async () => [{ id: 'ps1', number: 'PS-1', date: new Date('2026-04-23'), amount: '500', status: 'POSTED', postedAt: new Date('2026-04-23') }],
        },
      }),
    );
    const res = await GET(new Request('http://localhost/api/mobile/counterparty-360/s1?type=supplier'), {
      params: Promise.resolve({ id: 's1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('supplier');
    expect(body.counterparty.name).toBe('WidgetCo');
    expect(body.counterparty.code).toBeNull();
    expect(body.counterparty.address).toBeNull();
    expect(body.balance).toBe(1500);
    expect(body.invoices).toHaveLength(1);
    expect(body.invoices[0].total).toBe(500); // 5 * 100
    expect(body.payments[0].amount).toBe(500);
  });

  it('returns 404 for unknown supplier', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tenant: mockTenant });
    mockWithTenant.mockImplementation(async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        catalog_purchases_supplier: { findUnique: async () => null },
      }),
    );
    const res = await GET(new Request('http://localhost/api/mobile/counterparty-360/unknown?type=supplier'), {
      params: Promise.resolve({ id: 'unknown' }),
    });
    expect(res.status).toBe(404);
  });
});
