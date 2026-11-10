import type { AppContext } from '@/platform/auth/current-context';
import { defineCatalog, defineDocument, field } from '@/platform/metadata';
import { clearRegistry } from '@/platform/metadata/registry';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPresentationsForRefs } from './presentation-batch';

function makeCtx(tenantId = '00000000-0000-0000-0000-000000000001'): AppContext {
  return {
    tenant: { id: tenantId, name: 'Test', slug: 'test' } as unknown as AppContext['tenant'],
    user: { id: 'u1', clerkId: 'c1' } as unknown as AppContext['user'],
    membership: {
      id: 'm1',
      tenantId,
      userId: 'u1',
      roles: ['admin'],
    } as unknown as AppContext['membership'],
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map(),
    addons: new Set(),
  };
}

type FakeRecord = Record<string, unknown>;

function fakeTx(bag: Record<string, Record<string, FakeRecord>>) {
  const build = (records: Record<string, FakeRecord>) => ({
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => records[where.id] ?? null),
    findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id) => records[id]).filter((r): r is FakeRecord => Boolean(r)),
    ),
  });
  return Object.fromEntries(Object.entries(bag).map(([k, v]) => [k, build(v)])) as never;
}

describe('getPresentationsForRefs', () => {
  beforeEach(() => {
    clearRegistry();
  });
  afterEach(() => {
    clearRegistry();
  });

  it('returns empty map for empty input', async () => {
    const tx = fakeTx({});
    const result = await getPresentationsForRefs(makeCtx(), [], { tx });
    expect(result.size).toBe(0);
  });

  it('resolves references across multiple typeIds in a single call', async () => {
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    defineCatalog({
      module: 'inventory',
      name: 'product',
      label: { en: 'Product' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });

    const tx = fakeTx({
      catalog_sales_customer: {
        c1: { id: 'c1', name: 'Acme' },
        c2: { id: 'c2', name: 'Globex' },
      },
      catalog_inventory_product: {
        p1: { id: 'p1', name: 'Widget' },
      },
    });

    const result = await getPresentationsForRefs(
      makeCtx(),
      [
        { typeId: 'sales.customer', id: 'c1' },
        { typeId: 'sales.customer', id: 'c2' },
        { typeId: 'inventory.product', id: 'p1' },
      ],
      { tx },
    );

    expect(result.get('sales.customer:c1')).toBe('Acme');
    expect(result.get('sales.customer:c2')).toBe('Globex');
    expect(result.get('inventory.product:p1')).toBe('Widget');
  });

  it('falls back to short id when typeId is unknown', async () => {
    const tx = fakeTx({});
    const result = await getPresentationsForRefs(
      makeCtx(),
      [{ typeId: 'nope.nada', id: 'deadbeef-0000-0000-0000-000000000000' }],
      { tx },
    );
    expect(result.get('nope.nada:deadbeef-0000-0000-0000-000000000000')).toBe('deadbeef');
  });

  it('falls back to short id when row is missing', async () => {
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    const tx = fakeTx({ catalog_sales_customer: {} });
    const result = await getPresentationsForRefs(
      makeCtx(),
      [{ typeId: 'sales.customer', id: '11111111-2222-3333-4444-555555555555' }],
      { tx },
    );
    expect(result.get('sales.customer:11111111-2222-3333-4444-555555555555')).toBe('11111111');
  });

  it('deduplicates repeated (typeId, id) pairs', async () => {
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    const tx = fakeTx({
      catalog_sales_customer: { c1: { id: 'c1', name: 'Acme' } },
    });
    const result = await getPresentationsForRefs(
      makeCtx(),
      [
        { typeId: 'sales.customer', id: 'c1' },
        { typeId: 'sales.customer', id: 'c1' },
        { typeId: 'sales.customer', id: 'c1' },
      ],
      { tx },
    );
    expect(result.size).toBe(1);
    expect(result.get('sales.customer:c1')).toBe('Acme');
  });

  it('skips empty or non-string ids', async () => {
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    const tx = fakeTx({
      catalog_sales_customer: { c1: { id: 'c1', name: 'Acme' } },
    });
    const result = await getPresentationsForRefs(
      makeCtx(),
      [
        { typeId: 'sales.customer', id: '' },
        { typeId: 'sales.customer', id: 'c1' },
      ],
      { tx },
    );
    expect(result.has('sales.customer:')).toBe(false);
    expect(result.get('sales.customer:c1')).toBe('Acme');
  });

  it('mixes known + unknown typeIds in one call', async () => {
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer' },
      fields: { name: field.string({ label: { en: 'Name' }, required: true }) },
      permissions: { read: 'any', write: 'any' },
      displayField: 'name',
    });
    const tx = fakeTx({
      catalog_sales_customer: { c1: { id: 'c1', name: 'Acme' } },
    });
    const result = await getPresentationsForRefs(
      makeCtx(),
      [
        { typeId: 'sales.customer', id: 'c1' },
        { typeId: 'unknown.thing', id: 'aaaaaaaa-0000-0000-0000-000000000000' },
      ],
      { tx },
    );
    expect(result.get('sales.customer:c1')).toBe('Acme');
    expect(result.get('unknown.thing:aaaaaaaa-0000-0000-0000-000000000000')).toBe('aaaaaaaa');
  });

  it('resolves a document ref via the registry document map', async () => {
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
    const tx = fakeTx({
      document_sales_invoice: {
        d1: { id: 'd1', number: 'SI-000001', date: new Date('2026-04-16T00:00:00Z') },
      },
    });
    const result = await getPresentationsForRefs(
      makeCtx(),
      [{ typeId: 'sales.invoice', id: 'd1' }],
      { tx },
    );
    expect(result.get('sales.invoice:d1')).toBe('Invoice SI-000001 — 2026-04-16');
  });
});
