import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/configs/inventory/registers/stock-balance';
import type { RegisterMatrixCell, RegisterMatrixColumnHeader } from '@/platform/metadata';
import { productPricesView } from './product-prices';

// The loader resolves cost via the stock register (live average cost) and
// individual prices via the 1C-style resolver. Both are engine concerns with
// their own tests — mock them here so this spec isolates the loader's own
// column/cell shaping logic.
vi.mock('@/platform/engine/pricing', () => ({
  getProductAvgCost: vi.fn(async (_tx: unknown, _reg: unknown, productId: string) =>
    productId === 'p2'
      ? { cost: 50, quantity: 1, totalCost: 50 }
      : { cost: 0, quantity: 0, totalCost: 0 },
  ),
  resolvePriceForType: vi.fn(async () => null),
}));

type LoaderArgs = Parameters<typeof productPricesView.loader>[0];

const PRODUCTS = [
  // p1 carries a stale costPrice field but NO live stock — its cost must read
  // as empty, proving the loader ignores the dead `product.costPrice` column.
  { id: 'p1', code: 'C1', name: 'Cola', costPrice: '999' },
  // p2 has no costPrice field but DOES have live average cost (50).
  { id: 'p2', code: 'C2', name: 'Fanta', costPrice: null },
];

const PRICE_TYPES = [
  {
    id: 'pt-dyn',
    code: 'A78AB936', // auto-generated code — never matches a hardcoded set
    name: 'Dinamik 10',
    kind: 'dynamic',
    markupPct: '0.1',
    basePriceType: 'pt-static',
  },
  {
    id: 'pt-static',
    code: '99AE7EA8',
    name: 'Statik',
    kind: 'static',
    markupPct: null,
    basePriceType: null,
  },
];

function makeCtx(): LoaderArgs {
  const tx = {
    catalog_inventory_product: { findMany: async () => PRODUCTS },
    catalog_sales_price_type: { findMany: async () => PRICE_TYPES },
    register_inventory_product_price: {
      groupBy: async () => [] as unknown[],
      findFirst: async () => null,
    },
    document_inventory_price_setting: { findUnique: async () => null },
  } as unknown as LoaderArgs['tx'];

  return {
    tenant: { id: 't1', locale: 'tr', currency: 'TRY' },
    tx,
    period: {
      kind: 'month',
      year: 2026,
      month: 5,
      start: new Date(Date.UTC(2026, 4, 1)),
      end: new Date(Date.UTC(2026, 5, 1)),
    },
    chip: null,
    search: null,
    page: 1,
  };
}

function colByCode(cols: RegisterMatrixColumnHeader[], code: string) {
  const c = cols.find((x) => x.code === code);
  if (!c) throw new Error(`column ${code} not found`);
  return c;
}

describe('product-prices loader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the tenant’s own price-type columns by default (metadata-driven, not hardcoded codes)', async () => {
    const out = await productPricesView.loader(makeCtx());
    const matrix = out.matrix;
    if (!matrix) throw new Error('expected matrix payload');

    // The cost column is the locked anchor.
    const cost = colByCode(matrix.columns, 'CST');
    expect(cost.locked).toBe(true);
    expect(cost.defaultVisible).toBe(true);

    // Every price type the tenant defined must be visible by default and NOT
    // locked (so the user can still hide it). Their codes are arbitrary, so a
    // hardcoded code set would leave them hidden — the bug being fixed.
    for (const code of ['A78AB936', '99AE7EA8']) {
      const col = colByCode(matrix.columns, code);
      expect(col.defaultVisible).toBe(true);
      expect(col.locked).toBe(false);
    }
  });

  it('reads Maliyet from live average cost, not the dead product.costPrice field', async () => {
    const out = await productPricesView.loader(makeCtx());
    const matrix = out.matrix;
    if (!matrix) throw new Error('expected matrix payload');

    const costColIdx = matrix.columns.findIndex((c) => c.code === 'CST');
    const cell = (rowIdx: number): RegisterMatrixCell | undefined =>
      matrix.cells[rowIdx]?.[costColIdx];

    // p1: stale costPrice=999 but zero live cost → empty.
    expect(cell(0)?.formatted).toBeNull();
    // p2: no costPrice but live cost=50 → populated.
    expect(cell(1)?.formatted).not.toBeNull();
  });
});
