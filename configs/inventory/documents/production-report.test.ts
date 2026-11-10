import { describe, expect, it } from 'vitest';
import './production-report';
import { getRegistry } from '@/platform/metadata';

describe('inventory.production_report document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['inventory.production_report']).toBeDefined();
  });

  it('has required warehouse + finishedProduct + finishedQty on the header', () => {
    const cfg = getRegistry().document['inventory.production_report'];
    expect(cfg?.header?.warehouse?.required).toBe(true);
    expect(cfg?.header?.finishedProduct?.required).toBe(true);
    expect(cfg?.header?.finishedQty?.required).toBe(true);
  });

  it('materials line section requires product + quantity (min 1 row)', () => {
    const materials = getRegistry().document['inventory.production_report']?.lines?.materials;
    expect(materials?.minRows).toBe(1);
    expect(materials?.fields?.product?.required).toBe(true);
    expect(materials?.fields?.quantity?.required).toBe(true);
  });

  it('posts ONLY to inventory.stock_balance', () => {
    const cfg = getRegistry().document['inventory.production_report'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['inventory.stock_balance']);
  });

  it('emits N material expenses + 1 finished-product income, with totalCost summed', async () => {
    const cfg = getRegistry().document['inventory.production_report'];
    const fn = cfg?.posting['inventory.stock_balance'];
    if (!fn) throw new Error('expected posting fn');

    // Stub register.balanceAll: each material is worth 10/each at avg cost.
    const balances: Record<string, { quantity: number; totalCost: number }> = {
      'mat-a': { quantity: 100, totalCost: 1000 }, // avg 10
      'mat-b': { quantity: 50, totalCost: 250 }, // avg 5
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
        finishedProduct: 'fin-x',
        finishedQty: 1,
        lines: {
          materials: [
            { product: 'mat-a', quantity: 3 }, // 3 * 10 = 30
            { product: 'mat-b', quantity: 4 }, // 4 * 5  = 20
          ],
        },
      } as never,
      stubCtx,
    )) as Array<Record<string, unknown>>;

    expect(out).toHaveLength(3);
    // 2 expenses
    expect(out[0]).toMatchObject({
      kind: 'expense',
      warehouse: 'wh-1',
      product: 'mat-a',
      quantity: 3,
      totalCost: 30,
    });
    expect(out[1]).toMatchObject({
      kind: 'expense',
      warehouse: 'wh-1',
      product: 'mat-b',
      quantity: 4,
      totalCost: 20,
    });
    // 1 income for finished product = sum of material costs
    expect(out[2]).toMatchObject({
      kind: 'income',
      warehouse: 'wh-1',
      product: 'fin-x',
      quantity: 1,
      totalCost: 50,
    });
  });
});
