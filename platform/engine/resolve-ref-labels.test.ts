import {
  defineAccumulationRegister,
  defineCatalog,
  defineDocument,
  field,
} from '@/platform/metadata';
import { clearRegistry, getRegistry } from '@/platform/metadata/registry';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRefLabels } from './resolve-ref-labels';

type FakeRecord = Record<string, unknown>;

function fakeTx(bag: Record<string, Record<string, FakeRecord>>) {
  const build = (records: Record<string, FakeRecord>) => ({
    findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id) => records[id]).filter((r): r is FakeRecord => Boolean(r)),
    ),
  });
  return Object.fromEntries(Object.entries(bag).map(([k, v]) => [k, build(v)])) as never;
}

function defineStockBalance() {
  defineCatalog({
    module: 'inventory',
    name: 'product',
    label: { en: 'Product' },
    fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
    permissions: { read: 'any', write: 'any' },
    displayField: 'name',
  });
  defineCatalog({
    module: 'inventory',
    name: 'warehouse',
    label: { en: 'Warehouse' },
    fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
    permissions: { read: 'any', write: 'any' },
    displayField: 'name',
  });
  defineAccumulationRegister({
    module: 'inventory',
    name: 'stock_balance',
    label: { en: 'Stock Balance' },
    dimensions: {
      warehouse: field.reference({
        label: { en: 'Warehouse' },
        required: true,
        to: { kind: 'ref', module: 'inventory', name: 'warehouse' },
      }),
      product: field.reference({
        label: { en: 'Product' },
        required: true,
        to: { kind: 'ref', module: 'inventory', name: 'product' },
      }),
    },
    resources: {
      quantity: field.number({ label: { en: 'Quantity' }, required: true }),
    },
  });
  const reg = getRegistry().accumulationRegister['inventory.stock_balance'];
  if (!reg) throw new Error('test fixture: stock_balance not registered');
  return reg;
}

describe('resolveRefLabels', () => {
  beforeEach(() => clearRegistry());
  afterEach(() => clearRegistry());

  it('returns an empty array for no rows', async () => {
    const register = defineStockBalance();
    const tx = fakeTx({});
    const result = await resolveRefLabels(tx, register, []);
    expect(result).toEqual([]);
  });

  it('resolves ref-typed dimension UUIDs to display labels', async () => {
    const register = defineStockBalance();
    const tx = fakeTx({
      catalog_inventory_product: {
        'p-1': { id: 'p-1', name: 'Apple Bread' },
      },
      catalog_inventory_warehouse: {
        'w-1': { id: 'w-1', name: 'Main Warehouse' },
      },
    });
    const result = await resolveRefLabels(tx, register, [
      { groupKey: { product: 'p-1', warehouse: 'w-1' } },
    ]);
    expect(result).toEqual([{ product: 'Apple Bread', warehouse: 'Main Warehouse' }]);
  });

  it('omits the key when the ref target is missing', async () => {
    const register = defineStockBalance();
    const tx = fakeTx({
      catalog_inventory_product: {},
      catalog_inventory_warehouse: {
        'w-1': { id: 'w-1', name: 'Main Warehouse' },
      },
    });
    const result = await resolveRefLabels(tx, register, [
      { groupKey: { product: 'p-deleted', warehouse: 'w-1' } },
    ]);
    expect(result).toEqual([{ warehouse: 'Main Warehouse' }]);
  });

  it('returns empty maps when rows carry no ref dimension keys', async () => {
    const register = defineStockBalance();
    const tx = fakeTx({});
    const result = await resolveRefLabels(tx, register, [
      { groupKey: { kind: 'income' } },
      { groupKey: {} },
    ]);
    expect(result).toEqual([{}, {}]);
  });

  it('batches lookups per dimension across rows (one findMany per dim)', async () => {
    const register = defineStockBalance();
    const productDelegate = {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id, name: `Product ${id}` })),
      ),
    };
    const warehouseDelegate = {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id, name: `Warehouse ${id}` })),
      ),
    };
    const tx = {
      catalog_inventory_product: productDelegate,
      catalog_inventory_warehouse: warehouseDelegate,
    } as never;

    const rows = [
      { groupKey: { product: 'p-1', warehouse: 'w-1' } },
      { groupKey: { product: 'p-2', warehouse: 'w-1' } },
      { groupKey: { product: 'p-1', warehouse: 'w-2' } }, // p-1 dedup'd
    ];
    const result = await resolveRefLabels(tx, register, rows);

    expect(productDelegate.findMany).toHaveBeenCalledTimes(1);
    expect(warehouseDelegate.findMany).toHaveBeenCalledTimes(1);
    // Verify the unique sets passed in
    const productCall = productDelegate.findMany.mock.calls[0]?.[0] as {
      where: { id: { in: string[] } };
    };
    const warehouseCall = warehouseDelegate.findMany.mock.calls[0]?.[0] as {
      where: { id: { in: string[] } };
    };
    expect(productCall.where.id.in.sort()).toEqual(['p-1', 'p-2']);
    expect(warehouseCall.where.id.in.sort()).toEqual(['w-1', 'w-2']);

    expect(result[0]).toEqual({ product: 'Product p-1', warehouse: 'Warehouse w-1' });
    expect(result[1]).toEqual({ product: 'Product p-2', warehouse: 'Warehouse w-1' });
    expect(result[2]).toEqual({ product: 'Product p-1', warehouse: 'Warehouse w-2' });
  });

  it('falls through gracefully when the Prisma model is absent on tx', async () => {
    const register = defineStockBalance();
    const tx = {} as never; // no delegates registered
    const result = await resolveRefLabels(tx, register, [
      { groupKey: { product: 'p-1', warehouse: 'w-1' } },
    ]);
    expect(result).toEqual([{}]);
  });

  it('resolves a document-typed dimension via the document registry', async () => {
    defineDocument({
      module: 'sales',
      name: 'invoice',
      label: { en: 'Invoice' },
      header: {
        number: field.docNumber({ label: { en: 'Number' }, prefix: 'SI-' }),
        date: field.datetime({ label: { en: 'Date' }, required: true }),
      },
      posting: {},
      permissions: { read: 'any', write: 'any' },
    });
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    defineAccumulationRegister({
      module: 'sales',
      name: 'reserved',
      label: { en: 'Reserved' },
      dimensions: {
        customer: field.reference({
          label: { en: 'Customer' },
          required: true,
          to: { kind: 'ref', module: 'sales', name: 'customer' },
        }),
        order: field.reference({
          label: { en: 'Order' },
          required: true,
          to: { kind: 'ref', module: 'sales', name: 'invoice' },
        }),
      },
      resources: {
        quantity: field.number({ label: { en: 'Quantity' }, required: true }),
      },
    });
    const register = getRegistry().accumulationRegister['sales.reserved'];
    if (!register) throw new Error('test fixture: sales.reserved not registered');

    const tx = fakeTx({
      catalog_sales_customer: { 'c-1': { id: 'c-1', name: 'Acme' } },
      document_sales_invoice: {
        'd-1': { id: 'd-1', number: 'SI-000001', date: new Date('2026-04-16T00:00:00Z') },
      },
    });
    const result = await resolveRefLabels(tx, register, [
      { groupKey: { customer: 'c-1', order: 'd-1' } },
    ]);
    expect(result[0]?.customer).toBe('Acme');
    expect(result[0]?.order).toBe('Invoice SI-000001 — 2026-04-16');
  });
});
