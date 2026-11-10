import { describe, expect, it } from 'vitest';
import './purchase-order';
import { getRegistry } from '@/platform/metadata';

describe('purchases.order document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['purchases.order']).toBeDefined();
  });

  it('has required header refs: supplier + warehouse + date', () => {
    const cfg = getRegistry().document['purchases.order'];
    expect(cfg?.header?.supplier?.required).toBe(true);
    expect(cfg?.header?.warehouse?.required).toBe(true);
    expect(cfg?.header?.date?.required).toBe(true);
  });

  it('hides workflowStatus + assignedBuyerId from the form', () => {
    const cfg = getRegistry().document['purchases.order'];
    expect(cfg?.header?.workflowStatus?.formHidden).toBe(true);
    expect(cfg?.header?.assignedBuyerId?.formHidden).toBe(true);
  });

  it('has supplierDocNo as a visible optional string', () => {
    const sd = getRegistry().document['purchases.order']?.header?.supplierDocNo;
    expect(sd?.type).toBe('string');
    expect(sd?.required).toBeFalsy();
    expect(sd?.formHidden).toBeFalsy();
  });

  it('declares an items line section with product + quantity + price', () => {
    const items = getRegistry().document['purchases.order']?.lines?.items;
    expect(items).toBeDefined();
    expect(items?.minRows).toBe(1);
    expect(Object.keys(items?.fields ?? {}).sort()).toEqual(['price', 'product', 'quantity']);
  });

  it('posts ONLY to purchases.expected_stock', () => {
    const cfg = getRegistry().document['purchases.order'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['purchases.expected_stock']);
  });

  it('posting mapper emits one income row per line with (warehouse, product, supplier, quantity)', async () => {
    const cfg = getRegistry().document['purchases.order'];
    const fn = cfg?.posting['purchases.expected_stock'];
    expect(fn).toBeDefined();
    if (!fn) throw new Error('expected posting fn');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const out = (await fn(
      {
        date,
        supplier: 'sup-1',
        warehouse: 'wh-1',
        lines: {
          items: [
            { product: 'prod-a', quantity: 100 },
            { product: 'prod-b', quantity: 50 },
          ],
        },
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      kind: 'income',
      warehouse: 'wh-1',
      product: 'prod-a',
      supplier: 'sup-1',
      quantity: 100,
    });
    expect(out[1]).toMatchObject({
      kind: 'income',
      warehouse: 'wh-1',
      product: 'prod-b',
      supplier: 'sup-1',
      quantity: 50,
    });
  });
});
