import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn(),
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: vi.fn((_tenantId: string, fn: (tx: unknown) => unknown) => fn(stubTx)),
}));

const stubTx = {
  catalog_sales_price_type: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  movement_inventory_stock_balance: {
    findMany: vi.fn(),
    groupBy: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  },
  register_inventory_product_price: {
    findFirst: vi.fn(async () => null),
  },
};

import { GET } from './route';

const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';

async function mockTenant(): Promise<void> {
  const { requireTenantContext } = await import('@/platform/auth/current-context');
  (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    tenant: { id: 'tenant-1' },
  });
}

describe('GET /api/mobile/products/[id]/prices', () => {
  it('returns 400 on invalid uuid', async () => {
    const res = await GET(new Request('http://x/api/mobile/products/not-a-uuid/prices'), {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const { requireTenantContext } = await import('@/platform/auth/current-context');
    (requireTenantContext as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('no auth'),
    );
    const res = await GET(new Request('http://x/api/mobile/products/' + PRODUCT_ID + '/prices'), {
      params: Promise.resolve({ id: PRODUCT_ID }),
    });
    expect(res.status).toBe(401);
  });

  it('includes dynamic-no-base price types with computed live-cost × markup', async () => {
    await mockTenant();

    // Movements yield avg cost = 100 / 10 = 10
    stubTx.movement_inventory_stock_balance.findMany.mockResolvedValueOnce([
      { kind: 'income', quantity: 10, totalCost: 100 },
    ]);

    // Two price types: a static (no stored row → null, omitted) and a
    // dynamic-no-base with markup 0.2 → 10 * 1.2 = 12.
    stubTx.catalog_sales_price_type.findMany.mockResolvedValueOnce([
      { id: 'pt-static', name: 'Базовая', kind: 'static', isDefault: false },
      { id: 'pt-dyn-20', name: 'Dynamic 20', kind: 'dynamic', isDefault: true },
    ]);
    stubTx.catalog_sales_price_type.findUnique.mockImplementation(async (args: unknown) => {
      const id = (args as { where: { id: string } }).where.id;
      if (id === 'pt-static') {
        return { id, kind: 'static', basePriceType: null, markupPct: null };
      }
      if (id === 'pt-dyn-20') {
        return { id, kind: 'dynamic', basePriceType: null, markupPct: 0.2 };
      }
      return null;
    });

    const res = await GET(new Request('http://x/api/mobile/products/' + PRODUCT_ID + '/prices'), {
      params: Promise.resolve({ id: PRODUCT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    // Dynamic 20 must be present with live-cost-based price.
    const dyn = body.items.find((i: { priceTypeId: string }) => i.priceTypeId === 'pt-dyn-20');
    expect(dyn).toBeDefined();
    expect(dyn.value).toBe('12.00');
    expect(dyn.kind).toBe('dynamic');
    expect(dyn.isDefault).toBe(true);

    // Static without stored price should be filtered out.
    expect(body.items.find((i: { priceTypeId: string }) => i.priceTypeId === 'pt-static')).toBeUndefined();
  });

  it('omits dynamic-no-base when product has no stock cost', async () => {
    await mockTenant();

    // No movements → cost = 0 → dynamic-no-base falls through to null.
    stubTx.movement_inventory_stock_balance.findMany.mockResolvedValueOnce([]);

    stubTx.catalog_sales_price_type.findMany.mockResolvedValueOnce([
      { id: 'pt-dyn-20', name: 'Dynamic 20', kind: 'dynamic', isDefault: true },
    ]);
    stubTx.catalog_sales_price_type.findUnique.mockResolvedValueOnce({
      id: 'pt-dyn-20',
      kind: 'dynamic',
      basePriceType: null,
      markupPct: 0.2,
    });

    const res = await GET(new Request('http://x/api/mobile/products/' + PRODUCT_ID + '/prices'), {
      params: Promise.resolve({ id: PRODUCT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
  });
});
