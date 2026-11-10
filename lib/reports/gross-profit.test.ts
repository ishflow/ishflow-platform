import { describe, expect, it } from 'vitest';
import { buildGrossProfit } from './gross-profit';

type Sale = {
  product: string;
  quantity: number;
  cost: number;
  revenue: number;
  kind: string;
  timestamp: Date;
  active: boolean;
};

function makeTx(sales: Sale[], products: { id: string; name: string }[]) {
  const tx = {
    movement_sales_sale: {
      findMany: async (args: { where: { timestamp: { gte: Date; lte: Date } } }) => {
        const { gte, lte } = args.where.timestamp;
        return sales.filter(
          (s) => s.active && s.kind === 'income' && s.timestamp >= gte && s.timestamp <= lte,
        );
      },
    },
    catalog_inventory_product: {
      findMany: async (args: { where: { id: { in: string[] } } }) =>
        products.filter((p) => args.where.id.in.includes(p.id)),
    },
  };
  return tx as unknown as Parameters<typeof buildGrossProfit>[0];
}

const PROD_X = '33333333-3333-3333-3333-333333333333';
const PROD_Y = '44444444-4444-4444-4444-444444444444';

describe('buildGrossProfit', () => {
  it('computes profit, margin, and per-product rows', async () => {
    const t1 = new Date('2026-01-15T10:00:00Z');
    const tx = makeTx(
      [
        // PROD_X: rev=200 cost=120 -> profit=80 margin=40%
        {
          product: PROD_X,
          quantity: 2,
          cost: 120,
          revenue: 200,
          kind: 'income',
          timestamp: t1,
          active: true,
        },
        // PROD_Y: rev=100 cost=60 -> profit=40 margin=40%
        {
          product: PROD_Y,
          quantity: 1,
          cost: 60,
          revenue: 100,
          kind: 'income',
          timestamp: t1,
          active: true,
        },
        // out-of-range
        {
          product: PROD_X,
          quantity: 99,
          cost: 999,
          revenue: 999,
          kind: 'income',
          timestamp: new Date('2025-01-01'),
          active: true,
        },
      ],
      [
        { id: PROD_X, name: 'Widget' },
        { id: PROD_Y, name: 'Gadget' },
      ],
    );

    const out = await buildGrossProfit(
      tx,
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-01-31T23:59:59Z'),
    );
    expect(out.revenue).toBe('300.00');
    expect(out.cogs).toBe('180.00');
    expect(out.grossProfit).toBe('120.00');
    expect(out.marginPct).toBe('40.00');
    const x = out.byProduct.find((p) => p.productId === PROD_X);
    expect(x?.profit).toBe('80.00');
    expect(x?.marginPct).toBe('40.00');
  });

  it('handles zero revenue without dividing by zero', async () => {
    const out = await buildGrossProfit(
      makeTx([], []),
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-01-31T23:59:59Z'),
    );
    expect(out.revenue).toBe('0.00');
    expect(out.marginPct).toBe('0.00');
  });
});
