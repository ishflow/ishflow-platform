import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireTenantContextMock = vi.fn();
const listMovementsPagedMock = vi.fn();

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: () => requireTenantContextMock(),
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: async (_t: string, fn: (tx: unknown) => unknown) =>
    fn({
      catalog_inventory_product: {
        findMany: async () => [{ id: 'prod-1', name: 'Samsung' }],
      },
      catalog_inventory_warehouse: {
        findMany: async () => [{ id: 'wh-1', name: 'Main' }],
      },
      document_sales_invoice: {
        findMany: async () => [{ id: 'doc-1', number: 'INVOICE-000001' }],
      },
    }),
}));

vi.mock('@/platform/engine', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/platform/engine');
  return {
    ...actual,
    listMovementsPaged: (...args: unknown[]) => listMovementsPagedMock(...args),
  };
});

import { GET } from './route';

const fakeApp = { tenant: { id: 't1' } };

beforeEach(() => {
  requireTenantContextMock.mockReset();
  listMovementsPagedMock.mockReset();
  requireTenantContextMock.mockResolvedValue(fakeApp);
});

function makeReq(qs: string): Request {
  return new Request(`http://t/api/mobile/registers/inventory.stock_balance/movements?${qs}`);
}

const params = (register: string) => ({ params: Promise.resolve({ register }) });

describe('GET /api/mobile/registers/[register]/movements', () => {
  it('rejects unknown register with 404', async () => {
    const res = await GET(makeReq(''), params('nope.nope'));
    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated callers with 401', async () => {
    requireTenantContextMock.mockRejectedValueOnce(new Error('UNAUTH'));
    const res = await GET(makeReq(''), params('inventory.stock_balance'));
    expect(res.status).toBe(401);
  });

  it('returns empty items when engine yields no rows', async () => {
    listMovementsPagedMock.mockResolvedValueOnce({ rows: [], total: 0, page: 1, pageSize: 20 });
    const res = await GET(makeReq('product=11111111-1111-1111-1111-111111111111'), params('inventory.stock_balance'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.register).toBe('inventory.stock_balance');
  });

  it('decorates rows with product/warehouse/doc lookups and signs expense quantity', async () => {
    listMovementsPagedMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'mv-1',
          timestamp: new Date('2026-04-01T10:00:00Z'),
          kind: 'expense',
          docRef: 'doc-1',
          docType: 'sales.invoice',
          warehouse: 'wh-1',
          product: 'prod-1',
          quantity: 5,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    const res = await GET(makeReq('product=11111111-1111-1111-1111-111111111111'), params('inventory.stock_balance'));
    const body = await res.json();
    expect(body.items[0]).toMatchObject({
      id: 'mv-1',
      kind: 'expense',
      docRef: 'doc-1',
      docType: 'sales.invoice',
      docNumber: 'INVOICE-000001',
      warehouseId: 'wh-1',
      warehouseName: 'Main',
      productId: 'prod-1',
      productName: 'Samsung',
      quantity: '-5',
    });
  });

  it('rejects malformed product UUID with 400', async () => {
    const res = await GET(makeReq('product=not-a-uuid'), params('inventory.stock_balance'));
    expect(res.status).toBe(400);
  });
});
