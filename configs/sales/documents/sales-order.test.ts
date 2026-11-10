import { describe, expect, it } from 'vitest';
import './sales-order';
import { getRegistry } from '@/platform/metadata';

describe('sales.order document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['sales.order']).toBeDefined();
  });

  it('has required header refs: customer + warehouse + date', () => {
    const cfg = getRegistry().document['sales.order'];
    expect(cfg?.header?.customer?.required).toBe(true);
    expect(cfg?.header?.warehouse?.required).toBe(true);
    expect(cfg?.header?.date?.required).toBe(true);
  });

  it('hides workflowStatus + assignedRepId from the form', () => {
    const cfg = getRegistry().document['sales.order'];
    expect(cfg?.header?.workflowStatus?.formHidden).toBe(true);
    expect(cfg?.header?.assignedRepId?.formHidden).toBe(true);
  });

  it('declares workflowStatus as a maxLength-32 string', () => {
    const ws = getRegistry().document['sales.order']?.header?.workflowStatus;
    expect(ws?.type).toBe('string');
    if (ws?.type === 'string') {
      expect(ws.maxLength).toBe(32);
    }
  });

  it('declares an items line section with product + quantity + price', () => {
    const items = getRegistry().document['sales.order']?.lines?.items;
    expect(items).toBeDefined();
    expect(items?.minRows).toBe(1);
    expect(Object.keys(items?.fields ?? {}).sort()).toEqual(['price', 'product', 'quantity']);
  });

  it('posts ONLY to sales.reserved_stock', () => {
    const cfg = getRegistry().document['sales.order'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['sales.reserved_stock']);
  });

  it('posting mapper emits one income row per line with (warehouse, product, customer, quantity)', async () => {
    const cfg = getRegistry().document['sales.order'];
    const fn = cfg?.posting['sales.reserved_stock'];
    expect(fn).toBeDefined();
    if (!fn) throw new Error('expected posting fn');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const out = (await fn(
      {
        date,
        customer: 'cust-1',
        warehouse: 'wh-1',
        lines: {
          items: [
            { product: 'prod-a', quantity: 5 },
            { product: 'prod-b', quantity: 3 },
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
      customer: 'cust-1',
      quantity: 5,
    });
    expect(out[1]).toMatchObject({
      kind: 'income',
      warehouse: 'wh-1',
      product: 'prod-b',
      customer: 'cust-1',
      quantity: 3,
    });
  });
});
