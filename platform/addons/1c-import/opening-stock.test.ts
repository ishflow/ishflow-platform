import type { AppContext } from '@/platform/auth/current-context';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/configs/inventory/documents/stock-adjustment';
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/catalogs/warehouse';
import { importOpeningStock, mapOpeningStockRows } from './opening-stock';

vi.mock('@/platform/engine', async () => {
  const actual = await vi.importActual<typeof import('@/platform/engine')>('@/platform/engine');
  return {
    ...actual,
    createDocument: vi.fn(),
    postDocument: vi.fn(),
    deleteDocument: vi.fn(),
    listRecords: vi.fn(),
  };
});

import { createDocument, deleteDocument, listRecords, postDocument } from '@/platform/engine';

// listRecords is called for both the warehouse and the product catalog; route
// by config id so importer tests can supply each independently.
function mockCatalogs(
  products: Record<string, unknown>[],
  warehouses = [{ id: 'wh-1', name: 'Main' }],
) {
  vi.mocked(listRecords).mockImplementation(async (_ctx, config) => {
    if ((config as { id: string }).id === 'inventory.warehouse') return warehouses;
    return products;
  });
}

const ctx = {
  tenant: { id: 'tenant-1' },
  user: { id: 'user-1' },
  permissions: new Set<string>(['admin.organization:edit', 'inventory.stock_adjustment:create']),
  membership: null,
  viewAsRole: null,
} as unknown as AppContext;

beforeEach(() => {
  vi.mocked(createDocument).mockReset();
  vi.mocked(postDocument).mockReset();
  vi.mocked(deleteDocument).mockReset();
  vi.mocked(listRecords).mockReset();
  vi.mocked(listRecords).mockResolvedValue([]);
});

describe('mapOpeningStockRows', () => {
  it('maps Russian columns (Номенклатура / Количество / Себестоимость)', () => {
    const out = mapOpeningStockRows({
      headers: ['Номенклатура', 'Количество', 'Себестоимость'],
      rows: [
        { Номенклатура: 'Помада Алый', Количество: '10', Себестоимость: '5.50' },
        { Номенклатура: 'Тушь', Количество: '3', Себестоимость: '12' },
      ],
    });
    expect(out.errors).toEqual([]);
    expect(out.rows).toEqual([
      { product: 'Помада Алый', quantity: 10, unitCost: 5.5 },
      { product: 'Тушь', quantity: 3, unitCost: 12 },
    ]);
  });

  it('errors a row with empty product / non-positive qty / negative cost', () => {
    const out = mapOpeningStockRows({
      headers: ['Product', 'Qty', 'Cost'],
      rows: [
        { Product: '', Qty: '5', Cost: '1' },
        { Product: 'A', Qty: '0', Cost: '1' },
        { Product: 'B', Qty: '2', Cost: '-1' },
        { Product: 'C', Qty: '4', Cost: '2' },
      ],
    });
    expect(out.rows).toEqual([{ product: 'C', quantity: 4, unitCost: 2 }]);
    expect(out.errors).toHaveLength(3);
  });

  it('errors when a required column is missing', () => {
    const out = mapOpeningStockRows({ headers: ['Foo', 'Bar'], rows: [{ Foo: 'x', Bar: 'y' }] });
    expect(out.rows).toEqual([]);
    expect(out.errors.length).toBeGreaterThan(0);
  });

  it('parses Russian comma decimals and space thousands separators', () => {
    const out = mapOpeningStockRows({
      headers: ['Товар', 'Количество', 'Цена'],
      rows: [
        { Товар: 'A', Количество: '2', Цена: '5,50' },
        { Товар: 'B', Количество: '10', Цена: '1 234,5' },
      ],
    });
    expect(out.errors).toEqual([]);
    expect(out.rows).toEqual([
      { product: 'A', quantity: 2, unitCost: 5.5 },
      { product: 'B', quantity: 10, unitCost: 1234.5 },
    ]);
  });

  it('errors empty unit cost (no silent zero) and fractional quantity', () => {
    const out = mapOpeningStockRows({
      headers: ['Product', 'Qty', 'Cost'],
      rows: [
        { Product: 'A', Qty: '2', Cost: '' },
        { Product: 'B', Qty: '2.5', Cost: '1' },
        { Product: 'C', Qty: '3', Cost: '4' },
      ],
    });
    expect(out.rows).toEqual([{ product: 'C', quantity: 3, unitCost: 4 }]);
    expect(out.errors).toHaveLength(2);
  });
});

describe('importOpeningStock', () => {
  beforeEach(() => {
    mockCatalogs([
      { id: 'p-lipstick', externalId: 'GUID-1', name: 'Помада Алый' },
      { id: 'p-mascara', externalId: null, name: 'Тушь' },
    ]);
    vi.mocked(createDocument).mockResolvedValue({ id: 'doc-1' });
    vi.mocked(postDocument).mockResolvedValue({ movementCount: 2 });
    vi.mocked(deleteDocument).mockResolvedValue(undefined);
  });

  it('rejects an unknown warehouse (no DB FK on references)', async () => {
    await expect(
      importOpeningStock(ctx, {
        warehouseId: 'wh-bad',
        rows: [{ product: 'GUID-1', quantity: 1, unitCost: 1 }],
      }),
    ).rejects.toThrow(/warehouse not found/i);
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('errors rows that resolve to an ambiguous product name', async () => {
    mockCatalogs([
      { id: 'p1', externalId: null, name: 'Дубликат' },
      { id: 'p2', externalId: null, name: 'Дубликат' },
      { id: 'p3', externalId: 'G3', name: 'Уникум' },
    ]);
    const out = await importOpeningStock(ctx, {
      warehouseId: 'wh-1',
      rows: [
        { product: 'Дубликат', quantity: 1, unitCost: 1 },
        { product: 'G3', quantity: 2, unitCost: 2 },
      ],
    });
    expect(out.posted).toBe(1);
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]?.message).toMatch(/ambiguous/i);
  });

  it('deletes the orphaned SAVED document when posting fails', async () => {
    vi.mocked(postDocument).mockRejectedValue(new Error('plan limit exceeded'));
    await expect(
      importOpeningStock(ctx, {
        warehouseId: 'wh-1',
        rows: [{ product: 'GUID-1', quantity: 1, unitCost: 1 }],
      }),
    ).rejects.toThrow(/plan limit/i);
    expect(deleteDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'inventory.stock_adjustment' }),
      'doc-1',
    );
  });

  it('resolves products (externalId + name) and creates+posts one stock_adjustment', async () => {
    const out = await importOpeningStock(ctx, {
      warehouseId: 'wh-1',
      rows: [
        { product: 'GUID-1', quantity: 10, unitCost: 5.5 },
        { product: 'Тушь', quantity: 3, unitCost: 12 },
      ],
    });
    expect(out.posted).toBe(2);
    expect(out.skipped).toBe(0);
    expect(out.documentId).toBe('doc-1');
    expect(createDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'inventory.stock_adjustment' }),
      expect.objectContaining({
        warehouse: 'wh-1',
        lines: {
          items: [
            { product: 'p-lipstick', quantityDelta: 10, unitCost: 5.5 },
            { product: 'p-mascara', quantityDelta: 3, unitCost: 12 },
          ],
        },
      }),
    );
    expect(postDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'inventory.stock_adjustment' }),
      'doc-1',
    );
  });

  it('skips unresolved products but imports the rest', async () => {
    const out = await importOpeningStock(ctx, {
      warehouseId: 'wh-1',
      rows: [
        { product: 'GUID-1', quantity: 10, unitCost: 5.5 },
        { product: 'Unknown Product', quantity: 1, unitCost: 1 },
      ],
    });
    expect(out.posted).toBe(1);
    expect(out.skipped).toBe(1);
    expect(out.errors).toHaveLength(1);
    expect(out.documentId).toBe('doc-1');
  });

  it('creates no document when nothing resolves', async () => {
    const out = await importOpeningStock(ctx, {
      warehouseId: 'wh-1',
      rows: [{ product: 'Nope', quantity: 1, unitCost: 1 }],
    });
    expect(out.posted).toBe(0);
    expect(out.skipped).toBe(1);
    expect(out.documentId).toBeNull();
    expect(createDocument).not.toHaveBeenCalled();
    expect(postDocument).not.toHaveBeenCalled();
  });
});
