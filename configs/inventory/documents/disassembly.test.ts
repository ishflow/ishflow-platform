import { describe, expect, it } from 'vitest';
import './disassembly';
import { getRegistry } from '@/platform/metadata';

describe('inventory.disassembly document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['inventory.disassembly']).toBeDefined();
  });

  it('has required warehouse + sourceProduct + sourceQty on the header', () => {
    const cfg = getRegistry().document['inventory.disassembly'];
    expect(cfg?.header?.warehouse?.required).toBe(true);
    expect(cfg?.header?.sourceProduct?.required).toBe(true);
    expect(cfg?.header?.sourceQty?.required).toBe(true);
  });

  it('components line section requires product + quantity (min 1 row)', () => {
    const components = getRegistry().document['inventory.disassembly']?.lines?.components;
    expect(components?.minRows).toBe(1);
    expect(components?.fields?.product?.required).toBe(true);
    expect(components?.fields?.quantity?.required).toBe(true);
  });

  it('posts ONLY to inventory.stock_balance', () => {
    const cfg = getRegistry().document['inventory.disassembly'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['inventory.stock_balance']);
  });

  it('emits 1 source expense + N component incomes; component costs sum to source cost', async () => {
    const cfg = getRegistry().document['inventory.disassembly'];
    const fn = cfg?.posting['inventory.stock_balance'];
    if (!fn) throw new Error('expected posting fn');

    // Source kit avg cost: 100 / unit. We disassemble 2 kits → total 200.
    const balances: Record<string, { quantity: number; totalCost: number }> = {
      'kit-x': { quantity: 10, totalCost: 1000 }, // avg 100
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
        sourceProduct: 'kit-x',
        sourceQty: 2,
        lines: {
          components: [
            { product: 'comp-a', quantity: 3 }, // share 3/8 of 200 = 75
            { product: 'comp-b', quantity: 5 }, // share 5/8 of 200 = 125
          ],
        },
      } as never,
      stubCtx,
    )) as Array<Record<string, unknown>>;

    expect(out).toHaveLength(3);
    // 1 source expense @ 200
    expect(out[0]).toMatchObject({
      kind: 'expense',
      warehouse: 'wh-1',
      product: 'kit-x',
      quantity: 2,
      totalCost: 200,
    });
    expect(out[1]).toMatchObject({
      kind: 'income',
      warehouse: 'wh-1',
      product: 'comp-a',
      quantity: 3,
      totalCost: 75,
    });
    expect(out[2]).toMatchObject({
      kind: 'income',
      warehouse: 'wh-1',
      product: 'comp-b',
      quantity: 5,
      totalCost: 125,
    });

    // Sum of component costs == source cost (within rounding tolerance).
    const sourceCost = Number(out[0]?.totalCost ?? 0);
    const incomeSum = Number(out[1]?.totalCost ?? 0) + Number(out[2]?.totalCost ?? 0);
    expect(Math.abs(incomeSum - sourceCost)).toBeLessThan(0.01);
  });
});
