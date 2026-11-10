import type { ArAgingResponse } from '@ishflow/mobile-api-contract';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

type ArMovementRow = {
  customer: string;
  amount: Prisma.Decimal | number | string;
  kind: string;
  timestamp: Date;
  docRef: string;
};

type CustomerRow = { id: string; name: string };

type Bucket = '0-30' | '31-60' | '61-90' | '90+';

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  const n = Number(v as never);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function bucketFor(days: number): Bucket {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

/**
 * Per-customer A/R aging. We don't track per-invoice outstanding balance, so
 * the aging dimension is the *oldest unpaid income movement* per customer:
 *
 *  1. For every customer with any income movement, compute the signed balance
 *     (sum income − sum expense).
 *  2. If balance > 0 (= they owe us), find the oldest income row and use the
 *     days-since-its-timestamp as the aging dimension.
 *
 * The result mirrors the web dashboard's "open A/R per customer" + adds
 * bucket totals. `asOf` is always "now" — historical aging is out of scope.
 */
export async function buildArAging(tx: Tx, asOf: Date): Promise<ArAgingResponse> {
  const bag = tx as unknown as {
    movement_sales_accounts_receivable: {
      findMany: (args: unknown) => Promise<ArMovementRow[]>;
    };
    catalog_sales_customer: {
      findMany: (args: unknown) => Promise<CustomerRow[]>;
    };
  };

  const rows = await bag.movement_sales_accounts_receivable.findMany({
    where: { active: true, timestamp: { lte: asOf } },
    select: { customer: true, amount: true, kind: true, timestamp: true, docRef: true },
  });

  type CustomerAgg = { total: number; oldestIncome: Date | null };
  const byCustomer = new Map<string, CustomerAgg>();

  for (const row of rows) {
    const sign = row.kind === 'expense' ? -1 : 1;
    const amount = sign * toNumber(row.amount);
    const agg = byCustomer.get(row.customer) ?? { total: 0, oldestIncome: null };
    agg.total += amount;
    if (row.kind === 'income') {
      if (!agg.oldestIncome || row.timestamp < agg.oldestIncome) {
        agg.oldestIncome = row.timestamp;
      }
    }
    byCustomer.set(row.customer, agg);
  }

  // Drop customers whose net balance is zero or negative (= no outstanding).
  const owing = [...byCustomer.entries()].filter(([, v]) => v.total > 0);

  const customerIds = owing.map(([id]) => id);
  const customers = customerIds.length
    ? await bag.catalog_sales_customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true },
      })
    : [];
  const customerName = new Map(customers.map((c) => [c.id, c.name]));

  const bucketAgg: Record<Bucket, { total: number; count: number }> = {
    '0-30': { total: 0, count: 0 },
    '31-60': { total: 0, count: 0 },
    '61-90': { total: 0, count: 0 },
    '90+': { total: 0, count: 0 },
  };

  const byCustomerOut = owing
    .map(([id, v]) => {
      const oldest = v.oldestIncome ?? asOf;
      const days = Math.max(
        0,
        Math.floor((asOf.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const bucket = bucketFor(days);
      bucketAgg[bucket].total += v.total;
      bucketAgg[bucket].count += 1;
      return {
        customerId: id,
        customerName: customerName.get(id) ?? '',
        total: fmt(v.total),
        oldestDays: days,
      };
    })
    .sort((a, b) => Number(b.total) - Number(a.total));

  const buckets: ArAgingResponse['buckets'] = (['0-30', '31-60', '61-90', '90+'] as Bucket[]).map(
    (label) => ({
      label,
      total: fmt(bucketAgg[label].total),
      count: bucketAgg[label].count,
    }),
  );

  return {
    asOf: asOf.toISOString(),
    buckets,
    byCustomer: byCustomerOut,
  };
}
