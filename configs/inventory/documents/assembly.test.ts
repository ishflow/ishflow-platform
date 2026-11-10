import { describe, expect, it } from 'vitest';
import './assembly';
import { getRegistry } from '@/platform/metadata';

describe('inventory.assembly document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['inventory.assembly']).toBeDefined();
  });

  it('has required warehouse + finishedProduct + finishedQty on the header', () => {
    const cfg = getRegistry().document['inventory.assembly'];
    expect(cfg?.header?.warehouse?.required).toBe(true);
    expect(cfg?.header?.finishedProduct?.required).toBe(true);
    expect(cfg?.header?.finishedQty?.required).toBe(true);
  });

  it('components line section requires product + quantity (min 1 row)', () => {
    const components = getRegistry().document['inventory.assembly']?.lines?.components;
    expect(components?.minRows).toBe(1);
    expect(components?.fields?.product?.required).toBe(true);
    expect(components?.fields?.quantity?.required).toBe(true);
  });

  it('posts ONLY to inventory.stock_balance', () => {
    const cfg = getRegistry().document['inventory.assembly'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['inventory.stock_balance']);
  });

  it('emits N component expenses + 1 kit income, with totalCost summed', async () => {
    const cfg = getRegistry().document['inventory.assembly'];
    const fn = cfg?.posting['inventory.stock_balance'];
    if (!fn) throw new Error('expected posting fn');

    // Stub register.balanceAll: each component is worth a known avg cost.
    const balances: Record<string, { quantity: number; totalCost: number }> = {
      'comp-a': { quantity: 100, totalCost: 1000 }, // avg 10
      'comp-b': { quantity: 50, totalCost: 250 }, // avg 5
    };
    const stubCtx = {
      register: () => ({
        balance: async () => ({ quantity: 0 }),
        balanceAll: async (filter: Record<string, unknown>) => {
          const product = filter.product as string;
          return balances[product] ?? { quantity: 0, totalCost: 0 };
        },
      }),
      fx: {
        base: 'USD',
        convert: async (n: number) => n,
        docCurrency: () => 'USD',
        docRate: () => 1,
        rateOnDate: async () => 1,
      },
    } as unknown as Parameters<typeof fn>[1];

    const date = new Date('2026-05-22T00:00:00.000Z');
    const out = (await fn(
      {
        date,
        warehouse: 'wh-1',
        finishedProduct: 'kit-x',
        finishedQty: 1,
        lines: {
          components: [
            { product: 'comp-a', quantity: 3 }, // 3 * 10 = 30
            { product: 'comp-b', quantity: 4 }, // 4 * 5  = 20
          ],
        },
      } as never,
      stubCtx,
    )) as Array<Record<string, unknown>>;

    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({
      kind: 'expense',
      warehouse: 'wh-1',
      product: 'comp-a',
      quantity: 3,
      totalCost: 30,
    });
    expect(out[1]).toMatchObject({
      kind: 'expense',
      warehouse: 'wh-1',
      product: 'comp-b',
      quantity: 4,
      totalCost: 20,
    });
    expect(out[2]).toMatchObject({
      kind: 'income',
      warehouse: 'wh-1',
      product: 'kit-x',
      quantity: 1,
      totalCost: 50,
    });
  });
});
