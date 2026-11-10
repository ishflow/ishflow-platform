import { getRegistry } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';
import { computeLineCosts } from './sales-invoice';
import './sales-invoice';

describe('computeLineCosts', () => {
  it('returns avgCost per line using balance snapshots', async () => {
    const balances: Record<string, { quantity: number; totalCost: number }> = {
      'wh-1::prod-kola': { quantity: 1500, totalCost: 145000 }, // avg 96.666…
      'wh-1::prod-pepsi': { quantity: 100, totalCost: 7000 }, // avg 70
    };
    const ctx = {
      register: () => ({
        balance: async () => ({ quantity: 0 }),
        balanceAll: async (filter: Record<string, unknown>) => {
          const key = `${filter.warehouse}::${filter.product}`;
          return balances[key] ?? { quantity: 0, totalCost: 0 };
        },
      }),
    };

    const doc = {
      warehouse: 'wh-1',
      lines: {
        items: [
          { product: 'prod-kola', quantity: 200 },
          { product: 'prod-pepsi', quantity: 10 },
          { product: 'prod-kola', quantity: 50 }, // repeated key
        ],
      },
    };

    const map = await computeLineCosts(doc as never, ctx as never);
    expect(map.get(0)).toBeCloseTo(96.6667, 3);
    expect(map.get(1)).toBe(70);
    expect(map.get(2)).toBeCloseTo(96.6667, 3);
  });

  it('returns 0 when balance is empty (degenerate)', async () => {
    const ctx = {
      register: () => ({
        balance: async () => ({ quantity: 0 }),
        balanceAll: async () => ({ quantity: 0, totalCost: 0 }),
      }),
    };
    const doc = {
      warehouse: 'w',
      lines: { items: [{ product: 'p', quantity: 1 }] },
    };
    const map = await computeLineCosts(doc as never, ctx as never);
    expect(map.get(0)).toBe(0);
  });
});

describe('sales-invoice posting uses computeLineCosts', () => {
  it('stock_balance expense totalCost == sales.sale cost per line', async () => {
    const cfg = getRegistry().document['sales.invoice'];
    expect(cfg).toBeDefined();

    const balances: Record<string, { quantity: number; totalCost: number }> = {
      'wh-1::prod-kola': { quantity: 1500, totalCost: 145000 },
    };
    const ctx = {
      register: () => ({
        balance: async () => ({ quantity: 0 }),
        balanceAll: async (f: Record<string, unknown>) =>
          balances[`${f.warehouse}::${f.product}`] ?? { quantity: 0, totalCost: 0 },
      }),
    };

    const doc = {
      date: new Date('2026-04-18'),
      warehouse: 'wh-1',
      customer: 'cust-1',
      lines: {
        items: [{ product: 'prod-kola', quantity: 200, price: 150 }],
      },
    };

    const stockMapper = cfg?.posting['inventory.stock_balance'];
    const saleMapper = cfg?.posting['sales.sale'];
    if (!stockMapper || !saleMapper) throw new Error('mapper missing');
    const stockRows = (await stockMapper(doc as never, ctx as never)) as Array<
      Record<string, unknown>
    >;
    const saleRows = (await saleMapper(doc as never, ctx as never)) as Array<
      Record<string, unknown>
    >;

    expect(stockRows[0]?.totalCost).toBe(saleRows[0]?.cost);
    // avgCost = 145000 / 1500 = 96.6667; 200 * 96.6667 ≈ 19333.33
    expect(Number(saleRows[0]?.cost)).toBeCloseTo(19333.33, 2);
    expect(saleRows[0]?.revenue).toBe(30000); // 200 * 150
  });
});
