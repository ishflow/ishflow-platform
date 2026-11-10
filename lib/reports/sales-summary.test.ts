import { describe, expect, it } from 'vitest';
import { buildSalesSummary } from './sales-summary';

type Sale = {
  counterparty: string;
  product: string;
  quantity: number;
  revenue: number;
  kind: string;
  timestamp: Date;
  docRef: string;
  active: boolean;
};

function makeTx(
  sales: Sale[],
  customers: { id: string; name: string }[],
  products: { id: string; name: string }[],
) {
  const tx = {
    movement_sales_sale: {
      findMany: async (args: { where: { timestamp: { gte: Date; lte: Date } } }) => {
        const { gte, lte } = args.where.timestamp;
        return sales.filter(
          (s) => s.active && s.kind === 'income' && s.timestamp >= gte && s.timestamp <= lte,
        );
      },
    },
    catalog_sales_customer: {
      findMany: async (args: { where: { id: { in: string[] } } }) =>
        customers.filter((c) => args.where.id.in.includes(c.id)),
    },
    catalog_inventory_product: {
      findMany: async (args: { where: { id: { in: string[] } } }) =>
        products.filter((p) => args.where.id.in.includes(p.id)),
    },
  };
  return tx as unknown as Parameters<typeof buildSalesSummary>[0];
}

const CUST_A = '11111111-1111-1111-1111-111111111111';
const CUST_B = '22222222-2222-2222-2222-222222222222';
const PROD_X = '33333333-3333-3333-3333-333333333333';
const PROD_Y = '44444444-4444-4444-4444-444444444444';
const DOC_1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DOC_2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('buildSalesSummary', () => {
  it('sums revenue, counts distinct invoices, and groups per customer/product', async () => {
    const t1 = new Date('2026-01-15T10:00:00Z');
    const t2 = new Date('2026-01-20T10:00:00Z');
    const tx = makeTx(
      [
        // doc1: CUST_A buys PROD_X qty=2 rev=100, PROD_Y qty=1 rev=50
        {
          counterparty: CUST_A,
          product: PROD_X,
          quantity: 2,
          revenue: 100,
          kind: 'income',
          timestamp: t1,
          docRef: DOC_1,
          active: true,
        },
        {
          counterparty: CUST_A,
          product: PROD_Y,
          quantity: 1,
          revenue: 50,
          kind: 'income',
          timestamp: t1,
          docRef: DOC_1,
          active: true,
        },
        // doc2: CUST_B buys PROD_X qty=3 rev=150
        {
          counterparty: CUST_B,
          product: PROD_X,
          quantity: 3,
          revenue: 150,
          kind: 'income',
          timestamp: t2,
          docRef: DOC_2,
          active: true,
        },
        // out-of-range row — must be excluded
        {
          counterparty: CUST_A,
          product: PROD_X,
          quantity: 99,
          revenue: 999,
          kind: 'income',
          timestamp: new Date('2025-12-01T10:00:00Z'),
          docRef: 'cccc',
          active: true,
        },
        // inactive row — must be excluded
        {
          counterparty: CUST_A,
          product: PROD_X,
          quantity: 5,
          revenue: 50,
          kind: 'income',
          timestamp: t1,
          docRef: 'dddd',
          active: false,
        },
      ],
      [
        { id: CUST_A, name: 'Alpha' },
        { id: CUST_B, name: 'Beta' },
      ],
      [
        { id: PROD_X, name: 'Widget' },
        { id: PROD_Y, name: 'Gadget' },
      ],
    );

    const out = await buildSalesSummary(
      tx,
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-01-31T23:59:59Z'),
    );
    expect(out.totalRevenue).toBe('300.00');
    expect(out.invoiceCount).toBe(2);
    expect(out.byCustomer.find((c) => c.customerId === CUST_A)?.total).toBe('150.00');
    expect(out.byCustomer.find((c) => c.customerId === CUST_B)?.total).toBe('150.00');
    expect(out.byCustomer.find((c) => c.customerId === CUST_A)?.count).toBe(1);
    expect(out.byProduct.find((p) => p.productId === PROD_X)?.revenue).toBe('250.00');
    expect(out.byProduct.find((p) => p.productId === PROD_X)?.qty).toBe('5.00');
  });

  it('returns empty rows when there are no movements', async () => {
    const tx = makeTx([], [], []);
    const out = await buildSalesSummary(
      tx,
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-01-31T23:59:59Z'),
    );
    expect(out.totalRevenue).toBe('0.00');
    expect(out.invoiceCount).toBe(0);
    expect(out.byCustomer).toEqual([]);
    expect(out.byProduct).toEqual([]);
  });
});
