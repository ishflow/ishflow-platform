import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';

type TenantCtx = AppContext & { tenant: NonNullable<AppContext['tenant']> };

export type KpiSnapshot = {
  current: number;
  previous: number;
  /** Percent change vs previous; 0 when previous is 0. */
  delta: number;
};

type SumResult = { _sum: { amount?: number | string | null; revenue?: number | string | null } };
type AggregateFn = (args: unknown) => Promise<SumResult>;
type CountFn = (args: unknown) => Promise<number>;
type FindManyFn = (args: unknown) => Promise<Array<Record<string, unknown>>>;
type GroupByFn = (
  args: unknown,
) => Promise<Array<Record<string, unknown> & { _sum: Record<string, unknown> }>>;

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  // Prisma Decimal carries a toNumber() method but also serializes via String()
  const coerced = Number(v as never);
  return Number.isFinite(coerced) ? coerced : 0;
}

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function signedTotal(rows: Array<{ kind: string; amount: number }>): number {
  // A/R and A/P use kind='income' to add to the balance and kind='expense' to
  // reduce it. A simple SUM(amount) over-counts — we need income - expense.
  let total = 0;
  for (const r of rows) {
    total += r.kind === 'income' ? r.amount : -r.amount;
  }
  return total;
}

/**
 * Total open A/R or A/P = sum of **positive per-party balances** only.
 *
 * Each party's balance is income − expense; a party in *credit* (negative —
 * e.g. a customer who over-returned) is a separate liability, NOT a reduction
 * of the receivable/payable total. Summing globally (`signedTotal`) would net
 * that credit in and disagree with the A/R register + aging report, which sum
 * only owing parties. This keeps the dashboard KPI consistent with them.
 */
export function positiveBalanceTotal(
  rows: Array<{ party: string; kind: string; amount: number }>,
): number {
  const byParty = new Map<string, number>();
  for (const r of rows) {
    const prev = byParty.get(r.party) ?? 0;
    byParty.set(r.party, prev + (r.kind === 'income' ? r.amount : -r.amount));
  }
  let total = 0;
  for (const bal of byParty.values()) {
    if (bal > 0.005) total += bal;
  }
  return total;
}

export async function accountsReceivableTotal(ctx: TenantCtx): Promise<KpiSnapshot> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      movement_sales_accounts_receivable: { findMany: FindManyFn };
    };
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    const [nowRows, pastRows] = (await Promise.all([
      bag.movement_sales_accounts_receivable.findMany({
        where: { active: true },
        select: { customer: true, kind: true, amount: true },
      }),
      bag.movement_sales_accounts_receivable.findMany({
        where: { active: true, timestamp: { lte: thirtyDaysAgo } },
        select: { customer: true, kind: true, amount: true },
      }),
    ])) as [
      Array<{ customer: string; kind: string; amount: unknown }>,
      Array<{ customer: string; kind: string; amount: unknown }>,
    ];
    // Sum only owing customers (positive balances) so the KPI agrees with the
    // A/R register + aging report; a customer in credit is not netted in.
    const current = positiveBalanceTotal(
      nowRows.map((r) => ({ party: r.customer, kind: r.kind, amount: toNumber(r.amount) })),
    );
    const previous = positiveBalanceTotal(
      pastRows.map((r) => ({ party: r.customer, kind: r.kind, amount: toNumber(r.amount) })),
    );
    return { current, previous, delta: pctDelta(current, previous) };
  });
}

export async function accountsPayableTotal(ctx: TenantCtx): Promise<KpiSnapshot> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      movement_purchases_accounts_payable: { findMany: FindManyFn };
    };
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    const [nowRows, pastRows] = (await Promise.all([
      bag.movement_purchases_accounts_payable.findMany({
        where: { active: true },
        select: { supplier: true, kind: true, amount: true },
      }),
      bag.movement_purchases_accounts_payable.findMany({
        where: { active: true, timestamp: { lte: thirtyDaysAgo } },
        select: { supplier: true, kind: true, amount: true },
      }),
    ])) as [
      Array<{ supplier: string; kind: string; amount: unknown }>,
      Array<{ supplier: string; kind: string; amount: unknown }>,
    ];
    // Sum only suppliers we owe (positive balances) so the KPI agrees with the
    // A/P register; a supplier in credit is not netted in.
    const current = positiveBalanceTotal(
      nowRows.map((r) => ({ party: r.supplier, kind: r.kind, amount: toNumber(r.amount) })),
    );
    const previous = positiveBalanceTotal(
      pastRows.map((r) => ({ party: r.supplier, kind: r.kind, amount: toNumber(r.amount) })),
    );
    return { current, previous, delta: pctDelta(current, previous) };
  });
}

/**
 * Total cash-on-hand across every cash register: opening balances plus signed
 * (income − expense) movement totals, all in the tenant's single currency.
 */
export async function cashFundsTotal(ctx: TenantCtx): Promise<KpiSnapshot> {
  return withTenant(ctx.tenant.id, async (tx) => {
    // Opening balances across all registers (raw SQL — Phase 1 leftover).
    const registers = (await tx.$queryRawUnsafe(
      `SELECT id, opening_balance AS "openingBalance"
       FROM catalog_treasury_cash_register
       WHERE deleted_at IS NULL`,
    )) as Array<{ id: string; openingBalance: unknown }>;
    let openingTotal = 0;
    for (const r of registers) openingTotal += Number(r.openingBalance ?? 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const bag = tx as unknown as {
      movement_treasury_cash_funds: { groupBy: GroupByFn };
    };
    const [nowGrouped, pastGrouped] = await Promise.all([
      bag.movement_treasury_cash_funds.groupBy({
        by: ['kind'],
        where: { active: true },
        _sum: { amount: true },
      }),
      bag.movement_treasury_cash_funds.groupBy({
        by: ['kind'],
        where: { active: true, timestamp: { lte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
    ]);
    const currentMovement = signedTotal(
      nowGrouped.map((r) => ({ kind: String(r.kind), amount: toNumber(r._sum.amount) })),
    );
    const previousMovement = signedTotal(
      pastGrouped.map((r) => ({ kind: String(r.kind), amount: toNumber(r._sum.amount) })),
    );
    const current = openingTotal + currentMovement;
    const previous = openingTotal + previousMovement;
    return { current, previous, delta: pctDelta(current, previous) };
  });
}

export async function thisMonthSalesTotal(ctx: TenantCtx): Promise<KpiSnapshot> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      movement_sales_sale: { aggregate: AggregateFn };
    };
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const lastMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0),
    );
    const sameDayLastMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate(), 23, 59, 59, 999),
    );
    const [currentAgg, previousAgg] = await Promise.all([
      bag.movement_sales_sale.aggregate({
        _sum: { revenue: true },
        where: { active: true, kind: 'income', timestamp: { gte: monthStart } },
      }),
      bag.movement_sales_sale.aggregate({
        _sum: { revenue: true },
        where: {
          active: true,
          kind: 'income',
          timestamp: { gte: lastMonthStart, lte: sameDayLastMonth },
        },
      }),
    ]);
    const current = toNumber(currentAgg._sum.revenue);
    const previous = toNumber(previousAgg._sum.revenue);
    return { current, previous, delta: pctDelta(current, previous) };
  });
}

export async function openInvoiceCount(ctx: TenantCtx): Promise<KpiSnapshot> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      document_sales_invoice: { count: CountFn };
    };
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    const [current, previous] = await Promise.all([
      bag.document_sales_invoice.count({
        where: { status: 'SAVED', deletedAt: null },
      }),
      bag.document_sales_invoice.count({
        where: { status: 'SAVED', deletedAt: null, createdAt: { lte: sevenDaysAgo } },
      }),
    ]);
    return { current, previous, delta: pctDelta(current, previous) };
  });
}

export type TrendPoint = { date: string; sales: number; collections: number };

export async function last30DaysTrend(ctx: TenantCtx): Promise<TrendPoint[]> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      movement_sales_sale: { findMany: FindManyFn };
      movement_sales_accounts_receivable: { findMany: FindManyFn };
    };
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - 30);

    const [salesRows, collectionRows] = (await Promise.all([
      bag.movement_sales_sale.findMany({
        where: { active: true, kind: 'income', timestamp: { gte: from } },
        select: { timestamp: true, revenue: true },
      }),
      bag.movement_sales_accounts_receivable.findMany({
        where: { active: true, kind: 'expense', timestamp: { gte: from } },
        select: { timestamp: true, amount: true },
      }),
    ])) as [
      Array<{ timestamp: Date; revenue: unknown }>,
      Array<{ timestamp: Date; amount: unknown }>,
    ];

    const keyOf = (d: Date) => d.toISOString().slice(0, 10);
    const byDay = new Map<string, TrendPoint>();
    const days: string[] = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const key = keyOf(d);
      days.push(key);
      byDay.set(key, { date: key, sales: 0, collections: 0 });
    }
    for (const row of salesRows) {
      const key = keyOf(row.timestamp);
      const p = byDay.get(key);
      if (p) p.sales += toNumber(row.revenue);
    }
    for (const row of collectionRows) {
      const key = keyOf(row.timestamp);
      const p = byDay.get(key);
      if (p) p.collections += toNumber(row.amount);
    }
    return days.map((d) => byDay.get(d) ?? { date: d, sales: 0, collections: 0 });
  });
}

export type DueItem = {
  id: string;
  name: string;
  amount: number;
  date: string; // ISO yyyy-mm-dd of the imputed due date
};

/**
 * Upcoming-or-overdue sales obligations, one row per **customer** with
 * positive open A/R. Since no dueDate column exists, the imputed due
 * date is `(earliest unpaid invoice).date + 30 days` — the customer's
 * most urgent obligation. Amount is the customer's total open A/R
 * balance, not a per-invoice contribution. Only POSTED invoices
 * participate — a SAVED draft isn't "owed" yet.
 */
export async function upcomingReceivables(ctx: TenantCtx, limit = 5): Promise<DueItem[]> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      document_sales_invoice: { findMany: FindManyFn };
      movement_sales_accounts_receivable: { findMany: FindManyFn; groupBy: GroupByFn };
      catalog_sales_customer: { findMany: FindManyFn };
    };

    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setUTCDate(in7Days.getUTCDate() + 7);
    const dateCutoff = new Date(in7Days);
    dateCutoff.setUTCDate(dateCutoff.getUTCDate() - 30);

    const [invoices, arGrouped] = (await Promise.all([
      bag.document_sales_invoice.findMany({
        where: {
          deletedAt: null,
          status: 'POSTED',
          date: { lte: dateCutoff },
        },
        select: { id: true, customer: true, date: true },
        orderBy: { date: 'asc' },
      }),
      bag.movement_sales_accounts_receivable.groupBy({
        by: ['customer', 'kind'],
        where: { active: true },
        _sum: { amount: true },
      }),
    ])) as [
      Array<{ id: string; customer: string; date: Date }>,
      Array<{ customer: string; kind: string; _sum: { amount: unknown } }>,
    ];

    // Earliest invoice date per customer drives the imputed due date —
    // represents the customer's most urgent obligation.
    const earliestByCustomer = new Map<string, Date>();
    for (const inv of invoices) {
      const prev = earliestByCustomer.get(inv.customer);
      if (!prev || inv.date < prev) earliestByCustomer.set(inv.customer, inv.date);
    }

    // Open A/R balance per customer: income − expense (unchanged from prior version).
    const balanceByCustomer = new Map<string, number>();
    for (const r of arGrouped) {
      const prev = balanceByCustomer.get(r.customer) ?? 0;
      const amt = toNumber(r._sum.amount);
      const signed = r.kind === 'income' ? amt : -amt;
      balanceByCustomer.set(r.customer, prev + signed);
    }

    // One row per customer with positive balance, ordered by earliest invoice
    // date (most overdue first).
    const ranked = Array.from(earliestByCustomer.entries())
      .filter(([cid]) => (balanceByCustomer.get(cid) ?? 0) > 0)
      .sort(([, da], [, db]) => da.getTime() - db.getTime())
      .slice(0, limit);
    const topIds = ranked.map(([cid]) => cid);

    const customers =
      topIds.length === 0
        ? []
        : ((await bag.catalog_sales_customer.findMany({
            where: { id: { in: topIds } },
            select: { id: true, name: true },
          })) as Array<{ id: string; name: string }>);
    const nameById = new Map(customers.map((c) => [c.id, c.name]));

    return ranked.map(([customerId, earliest]) => {
      const imputedDue = new Date(earliest);
      imputedDue.setUTCDate(imputedDue.getUTCDate() + 30);
      return {
        id: customerId,
        name: nameById.get(customerId) ?? customerId,
        amount: balanceByCustomer.get(customerId) ?? 0,
        date: imputedDue.toISOString().slice(0, 10),
      };
    });
  });
}

export type LowStockSnapshot = { count: number; threshold: number };

/**
 * Count of products whose current on-hand quantity is strictly below `threshold`.
 *
 * On-hand = SUM(income quantity) - SUM(expense quantity) per product, across
 * active movements. Uses two groupBy passes (one per kind) because Prisma's
 * groupBy cannot express a signed sum in a single call.
 *
 * TODO: when the product DSL gains a per-product `minStock` field, switch to
 * comparing against that instead of a tenant-wide threshold.
 */
export async function lowStockCount(ctx: TenantCtx, threshold = 5): Promise<LowStockSnapshot> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      movement_inventory_stock_balance: {
        groupBy: (
          args: unknown,
        ) => Promise<Array<{ product: string; _sum: { quantity: unknown } }>>;
      };
    };

    const [incomeRows, expenseRows] = await Promise.all([
      bag.movement_inventory_stock_balance.groupBy({
        by: ['product'],
        where: { active: true, kind: 'income' },
        _sum: { quantity: true },
      }),
      bag.movement_inventory_stock_balance.groupBy({
        by: ['product'],
        where: { active: true, kind: 'expense' },
        _sum: { quantity: true },
      }),
    ]);

    // Build a map of productId → net on-hand quantity
    const onHandByProduct = new Map<string, number>();
    for (const row of incomeRows) {
      const prev = onHandByProduct.get(row.product) ?? 0;
      onHandByProduct.set(row.product, prev + toNumber(row._sum.quantity));
    }
    for (const row of expenseRows) {
      const prev = onHandByProduct.get(row.product) ?? 0;
      onHandByProduct.set(row.product, prev - toNumber(row._sum.quantity));
    }

    let count = 0;
    for (const onHand of onHandByProduct.values()) {
      if (onHand < threshold) count += 1;
    }
    return { count, threshold };
  });
}

export async function upcomingPayables(ctx: TenantCtx, limit = 5): Promise<DueItem[]> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      document_purchases_invoice: { findMany: FindManyFn };
      movement_purchases_accounts_payable: { findMany: FindManyFn; groupBy: GroupByFn };
      catalog_purchases_supplier: { findMany: FindManyFn };
    };

    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setUTCDate(in7Days.getUTCDate() + 7);
    const dateCutoff = new Date(in7Days);
    dateCutoff.setUTCDate(dateCutoff.getUTCDate() - 30);

    const [invoices, apGrouped] = (await Promise.all([
      bag.document_purchases_invoice.findMany({
        where: {
          deletedAt: null,
          status: 'POSTED',
          date: { lte: dateCutoff },
        },
        select: { id: true, supplier: true, date: true, number: true },
        orderBy: { date: 'asc' },
        take: limit * 3,
      }),
      bag.movement_purchases_accounts_payable.groupBy({
        by: ['supplier', 'kind'],
        where: { active: true },
        _sum: { amount: true },
      }),
    ])) as [
      Array<{ id: string; supplier: string; date: Date; number: string }>,
      Array<{ supplier: string; kind: string; _sum: { amount: unknown } }>,
    ];

    const balanceBySupplier = new Map<string, number>();
    for (const r of apGrouped) {
      const prev = balanceBySupplier.get(r.supplier) ?? 0;
      const amt = toNumber(r._sum.amount);
      const signed = r.kind === 'income' ? amt : -amt;
      balanceBySupplier.set(r.supplier, prev + signed);
    }

    const unpaidInvoices = invoices.filter((inv) => (balanceBySupplier.get(inv.supplier) ?? 0) > 0);
    const topN = unpaidInvoices.slice(0, limit);

    const supplierIds = Array.from(new Set(topN.map((i) => i.supplier)));
    const suppliers =
      supplierIds.length === 0
        ? []
        : ((await bag.catalog_purchases_supplier.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, name: true },
          })) as Array<{ id: string; name: string }>);
    const nameById = new Map(suppliers.map((s) => [s.id, s.name]));

    return topN.map((inv) => {
      const imputedDue = new Date(inv.date);
      imputedDue.setUTCDate(imputedDue.getUTCDate() + 30);
      return {
        id: inv.supplier,
        name: nameById.get(inv.supplier) ?? inv.supplier,
        amount: balanceBySupplier.get(inv.supplier) ?? 0,
        date: imputedDue.toISOString().slice(0, 10),
      };
    });
  });
}

export type ActivityKind = 'saved' | 'posted' | 'paid';
export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  label: string;
  href: string;
  /** ISO timestamp of the event. */
  timestamp: string;
};

/**
 * The most recent N document events across sales invoices, purchase invoices,
 * and payments in either direction. "Paid" is emitted for POSTED payment docs;
 * "Posted" is emitted for POSTED invoices; "Saved" for the latest SAVED-status
 * invoices that are not yet posted. We order by the most relevant timestamp
 * on each class (postedAt when available, else updatedAt).
 */
export async function recentActivity(ctx: TenantCtx, limit = 10): Promise<ActivityItem[]> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      document_sales_invoice: { findMany: FindManyFn };
      document_purchases_invoice: { findMany: FindManyFn };
      document_sales_payment_received: { findMany: FindManyFn };
      document_purchases_payment_sent: { findMany: FindManyFn };
    };

    const [salesInv, purchInv, payIn, payOut] = await Promise.all([
      bag.document_sales_invoice.findMany({
        where: { deletedAt: null },
        select: { id: true, number: true, status: true, postedAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }) as Promise<
        Array<{
          id: string;
          number: string;
          status: string;
          postedAt: Date | null;
          updatedAt: Date;
        }>
      >,
      bag.document_purchases_invoice.findMany({
        where: { deletedAt: null },
        select: { id: true, number: true, status: true, postedAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }) as Promise<
        Array<{
          id: string;
          number: string;
          status: string;
          postedAt: Date | null;
          updatedAt: Date;
        }>
      >,
      bag.document_sales_payment_received.findMany({
        where: { deletedAt: null, status: 'POSTED' },
        select: { id: true, number: true, postedAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }) as Promise<Array<{ id: string; number: string; postedAt: Date | null; updatedAt: Date }>>,
      bag.document_purchases_payment_sent.findMany({
        where: { deletedAt: null, status: 'POSTED' },
        select: { id: true, number: true, postedAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }) as Promise<Array<{ id: string; number: string; postedAt: Date | null; updatedAt: Date }>>,
    ]);

    type Row = { id: string; number: string; kind: ActivityKind; href: string; ts: Date };
    const events: Row[] = [];
    for (const r of salesInv) {
      const kind: ActivityKind = r.status === 'POSTED' ? 'posted' : 'saved';
      events.push({
        id: r.id,
        number: r.number,
        kind,
        href: `/documents/sales.invoice/${r.id}`,
        ts: r.postedAt ?? r.updatedAt,
      });
    }
    for (const r of purchInv) {
      const kind: ActivityKind = r.status === 'POSTED' ? 'posted' : 'saved';
      events.push({
        id: r.id,
        number: r.number,
        kind,
        href: `/documents/purchases.invoice/${r.id}`,
        ts: r.postedAt ?? r.updatedAt,
      });
    }
    for (const r of payIn) {
      events.push({
        id: r.id,
        number: r.number,
        kind: 'paid',
        href: `/documents/sales.payment_received/${r.id}`,
        ts: r.postedAt ?? r.updatedAt,
      });
    }
    for (const r of payOut) {
      events.push({
        id: r.id,
        number: r.number,
        kind: 'paid',
        href: `/documents/purchases.payment_sent/${r.id}`,
        ts: r.postedAt ?? r.updatedAt,
      });
    }

    events.sort((a, b) => b.ts.getTime() - a.ts.getTime());
    return events.slice(0, limit).map((e) => ({
      id: e.id,
      kind: e.kind,
      label: `#${e.number}`,
      href: e.href,
      timestamp: e.ts.toISOString(),
    }));
  });
}

/**
 * Count of stock movement rows whose business `timestamp` falls on today.
 * Used by the warehouse dashboard so the role can see "how busy was the
 * warehouse today" at a glance.
 */
export async function todayStockMovementCount(ctx: TenantCtx): Promise<{ count: number }> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const bag = tx as unknown as {
      movement_inventory_stock_balance: {
        count: (args: unknown) => Promise<number>;
      };
    };
    const count = await bag.movement_inventory_stock_balance.count({
      where: { active: true, timestamp: { gte: start } },
    });
    return { count };
  });
}

/**
 * Count of stock movement rows in the last 7 days (rolling window from
 * today midnight). Mirrors `todayStockMovementCount` but covers a week —
 * gives the warehouse role a sense of weekly throughput.
 */
export async function weekStockMovementCount(ctx: TenantCtx): Promise<{ count: number }> {
  return withTenant(ctx.tenant.id, async (tx) => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const bag = tx as unknown as {
      movement_inventory_stock_balance: {
        count: (args: unknown) => Promise<number>;
      };
    };
    const count = await bag.movement_inventory_stock_balance.count({
      where: { active: true, timestamp: { gte: start } },
    });
    return { count };
  });
}
