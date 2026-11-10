import { describe, expect, it } from 'vitest';
import { buildArAging } from './ar-aging';

type Mvmt = {
  customer: string;
  amount: number;
  kind: string;
  timestamp: Date;
  docRef: string;
  active: boolean;
};

function makeTx(mvmts: Mvmt[], customers: { id: string; name: string }[]) {
  const tx = {
    movement_sales_accounts_receivable: {
      findMany: async (args: { where: { timestamp: { lte: Date } } }) =>
        mvmts.filter((m) => m.active && m.timestamp <= args.where.timestamp.lte),
    },
    catalog_sales_customer: {
      findMany: async (args: { where: { id: { in: string[] } } }) =>
        customers.filter((c) => args.where.id.in.includes(c.id)),
    },
  };
  return tx as unknown as Parameters<typeof buildArAging>[0];
}

const CUST_A = '11111111-1111-1111-1111-111111111111';
const CUST_B = '22222222-2222-2222-2222-222222222222';
const CUST_C = '33333333-3333-3333-3333-333333333333';

describe('buildArAging', () => {
  it('buckets by oldest income age and drops fully-paid customers', async () => {
    const asOf = new Date('2026-05-10T00:00:00Z');
    // CUST_A: 100 income 5 days ago, owes us 100 -> 0-30 bucket
    const aIncome = new Date('2026-05-05T00:00:00Z');
    // CUST_B: 200 income 100 days ago, 50 paid -> owes 150 -> 90+
    const bIncome = new Date('2026-01-30T00:00:00Z');
    const bPayment = new Date('2026-02-15T00:00:00Z');
    // CUST_C: 100 income, 100 payment -> net 0 -> excluded
    const cIncome = new Date('2026-05-01T00:00:00Z');
    const cPayment = new Date('2026-05-02T00:00:00Z');

    const tx = makeTx(
      [
        {
          customer: CUST_A,
          amount: 100,
          kind: 'income',
          timestamp: aIncome,
          docRef: 'd1',
          active: true,
        },
        {
          customer: CUST_B,
          amount: 200,
          kind: 'income',
          timestamp: bIncome,
          docRef: 'd2',
          active: true,
        },
        {
          customer: CUST_B,
          amount: 50,
          kind: 'expense',
          timestamp: bPayment,
          docRef: 'd3',
          active: true,
        },
        {
          customer: CUST_C,
          amount: 100,
          kind: 'income',
          timestamp: cIncome,
          docRef: 'd4',
          active: true,
        },
        {
          customer: CUST_C,
          amount: 100,
          kind: 'expense',
          timestamp: cPayment,
          docRef: 'd5',
          active: true,
        },
      ],
      [
        { id: CUST_A, name: 'Alpha' },
        { id: CUST_B, name: 'Beta' },
        { id: CUST_C, name: 'Gamma' },
      ],
    );

    const out = await buildArAging(tx, asOf);
    const ids = out.byCustomer.map((c) => c.customerId);
    expect(ids).toContain(CUST_A);
    expect(ids).toContain(CUST_B);
    expect(ids).not.toContain(CUST_C);

    const a = out.byCustomer.find((c) => c.customerId === CUST_A);
    const b = out.byCustomer.find((c) => c.customerId === CUST_B);
    expect(a?.total).toBe('100.00');
    expect(b?.total).toBe('150.00');
    expect(a?.oldestDays).toBe(5);
    expect(b?.oldestDays).toBeGreaterThanOrEqual(99);

    const bucketMap = Object.fromEntries(out.buckets.map((b) => [b.label, b]));
    expect(bucketMap['0-30']?.count).toBe(1);
    expect(bucketMap['0-30']?.total).toBe('100.00');
    expect(bucketMap['90+']?.count).toBe(1);
    expect(bucketMap['90+']?.total).toBe('150.00');
  });

  it('returns all-zero buckets when there is no debt', async () => {
    const out = await buildArAging(makeTx([], []), new Date('2026-05-10T00:00:00Z'));
    expect(out.byCustomer).toEqual([]);
    expect(out.buckets.every((b) => b.count === 0 && b.total === '0.00')).toBe(true);
  });
});
