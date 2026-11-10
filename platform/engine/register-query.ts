import type { AccumulationRegisterConfig } from '@/platform/metadata';

type PrismaMovement = {
  findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
  count: (args: unknown) => Promise<number>;
  groupBy: (args: unknown) => Promise<Array<Record<string, unknown>>>;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function movementDelegate(
  tx: unknown,
  register: AccumulationRegisterConfig,
): PrismaMovement {
  const snake = `movement_${register.module}_${register.name}`;
  const camel = `movement${capitalize(register.module)}${capitalize(register.name)}`;
  const bag = tx as Record<string, PrismaMovement | undefined>;
  const d = bag[snake] ?? bag[camel];
  if (!d) throw new Error(`movementDelegate: no Prisma model for ${snake}`);
  return d;
}

/**
 * Compute the active signed balance of every resource in a register. Each
 * resource is summed across movements matching the given dimension filter;
 * income rows add, expense rows subtract.
 *
 * Returns a plain object keyed by resource name.
 */
export async function registerBalanceAll(
  tx: unknown,
  register: AccumulationRegisterConfig,
  filter: Record<string, unknown>,
): Promise<Record<string, number>> {
  const resourceKeys = Object.keys(register.resources);
  if (resourceKeys.length === 0) {
    throw new Error(`register ${register.id} has no resources`);
  }
  const select: Record<string, true> = { kind: true };
  for (const k of resourceKeys) select[k] = true;
  const rows = await movementDelegate(tx, register).findMany({
    where: { active: true, ...filter },
    select,
  });
  const out: Record<string, number> = Object.fromEntries(resourceKeys.map((k) => [k, 0]));
  for (const row of rows) {
    const sign = row.kind === 'expense' ? -1 : 1;
    for (const k of resourceKeys) {
      const raw = row[k];
      const n = Number(raw);
      if (Number.isNaN(n)) continue;
      out[k] = (out[k] ?? 0) + sign * n;
    }
  }
  return out;
}

/**
 * Back-compat wrapper. Returns the signed sum of the register's PRIMARY
 * resource keyed as { quantity }. Callers that need every resource should
 * use `registerBalanceAll`.
 */
export async function registerBalance(
  tx: unknown,
  register: AccumulationRegisterConfig,
  filter: Record<string, unknown>,
): Promise<{ quantity: number }> {
  const all = await registerBalanceAll(tx, register, filter);
  const primary = Object.keys(register.resources)[0];
  if (!primary) throw new Error(`register ${register.id} has no resources`);
  return { quantity: all[primary] ?? 0 };
}

/**
 * Sum the primary resource of a register grouped by the given dimension keys,
 * applying the movement's kind as a sign (income adds, expense subtracts).
 *
 * Primary resource = the first key in `register.resources`. Multi-resource
 * grouping is Sprint 7+.
 *
 * Because Prisma `groupBy` cannot express a signed sum in a single call, we
 * do two aggregations (one per kind) and combine in JS.
 */
export async function registerBalanceGrouped(
  tx: unknown,
  register: AccumulationRegisterConfig,
  filter: Record<string, unknown>,
  groupBy: readonly string[],
): Promise<Array<Record<string, unknown>>> {
  const resourceKey = Object.keys(register.resources)[0];
  if (!resourceKey) throw new Error(`register ${register.id} has no resources`);
  for (const g of groupBy) {
    if (!(g in register.dimensions)) {
      throw new Error(`registerBalanceGrouped: "${g}" is not a dimension of ${register.id}`);
    }
  }

  const delegate = movementDelegate(tx, register);
  const baseWhere = { active: true, ...filter };
  const [income, expense] = await Promise.all([
    delegate.groupBy({
      by: [...groupBy],
      where: { ...baseWhere, kind: 'income' },
      _sum: { [resourceKey]: true },
    }),
    delegate.groupBy({
      by: [...groupBy],
      where: { ...baseWhere, kind: 'expense' },
      _sum: { [resourceKey]: true },
    }),
  ]);

  const key = (row: Record<string, unknown>) => groupBy.map((g) => String(row[g])).join('||');
  const out = new Map<string, Record<string, unknown>>();
  for (const row of income) {
    const sum = Number(((row._sum ?? {}) as Record<string, unknown>)[resourceKey] ?? 0);
    const clone: Record<string, unknown> = {};
    for (const g of groupBy) clone[g] = row[g];
    clone[resourceKey] = sum;
    out.set(key(row), clone);
  }
  for (const row of expense) {
    const sum = Number(((row._sum ?? {}) as Record<string, unknown>)[resourceKey] ?? 0);
    const k = key(row);
    const prev = out.get(k);
    if (prev) {
      prev[resourceKey] = Number(prev[resourceKey]) - sum;
    } else {
      const clone: Record<string, unknown> = {};
      for (const g of groupBy) clone[g] = row[g];
      clone[resourceKey] = -sum;
      out.set(k, clone);
    }
  }
  return [...out.values()];
}

export type MovementPage = {
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

/**
 * List movements for a register, paginated, ordered by timestamp desc.
 *
 * `filter` merges into the where clause; `active: true` is added unless
 * `includeInactive` is set. Page size is clamped to [1, 200].
 */
export async function listMovementsPaged(
  tx: unknown,
  register: AccumulationRegisterConfig,
  opts: {
    page?: number;
    pageSize?: number;
    filter?: Record<string, unknown>;
    includeInactive?: boolean;
  },
): Promise<MovementPage> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
  // Exclude any caller-supplied `active` key from `filter` — activation state is
  // controlled solely by the `includeInactive` option to avoid silent overrides.
  const { active: _active, ...safeFilter } = (opts.filter ?? {}) as Record<string, unknown>;
  const where: Record<string, unknown> = {
    ...safeFilter,
    ...(opts.includeInactive ? {} : { active: true }),
  };

  const delegate = movementDelegate(tx, register);
  const [rows, total] = await Promise.all([
    delegate.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    delegate.count({ where }),
  ]);
  return { rows, total, page, pageSize };
}

export type TurnoverRow = Record<string, unknown> & {
  opening: number;
  income: number;
  expense: number;
  closing: number;
};

/**
 * Period turnover for an accumulation register, grouped by zero or more
 * dimensions. Each row reports opening (signed balance before `from`),
 * inflow (unsigned sum of income rows in period), outflow (unsigned sum of
 * expense rows in period), and closing (opening + income - expense).
 *
 * `groupBy` entries must all be dimensions of the register. An empty
 * `groupBy` yields a single aggregate row.
 */
export async function turnover(
  tx: unknown,
  register: AccumulationRegisterConfig,
  filter: Record<string, unknown>,
  opts: { from: Date; to: Date; groupBy: readonly string[] },
): Promise<TurnoverRow[]> {
  const resourceKey = Object.keys(register.resources)[0];
  if (!resourceKey) throw new Error(`register ${register.id} has no resources`);
  for (const g of opts.groupBy) {
    if (!(g in register.dimensions)) {
      throw new Error(`turnover: "${g}" is not a dimension of ${register.id}`);
    }
  }

  const { timestamp: _stripped, ...rest } = filter;
  const baseWhere = { active: true, ...rest };
  const openingWhere = { ...baseWhere, timestamp: { lt: opts.from } };
  const periodBase = { ...baseWhere, timestamp: { gte: opts.from, lte: opts.to } };
  const incomeWhere = { ...periodBase, kind: 'income' };
  const expenseWhere = { ...periodBase, kind: 'expense' };

  const delegate = movementDelegate(tx, register);

  if (opts.groupBy.length === 0) {
    const [openingRows, incomeRows, expenseRows] = await Promise.all([
      delegate.findMany({
        where: openingWhere,
        select: { kind: true, [resourceKey]: true },
      }),
      delegate.findMany({ where: incomeWhere, select: { [resourceKey]: true } }),
      delegate.findMany({ where: expenseWhere, select: { [resourceKey]: true } }),
    ]);
    let opening = 0;
    for (const row of openingRows) {
      const q = Number(row[resourceKey]);
      if (Number.isNaN(q)) continue;
      opening += row.kind === 'expense' ? -q : q;
    }
    const income = incomeRows.reduce((acc, r) => {
      const q = Number(r[resourceKey]);
      return Number.isNaN(q) ? acc : acc + q;
    }, 0);
    const expense = expenseRows.reduce((acc, r) => {
      const q = Number(r[resourceKey]);
      return Number.isNaN(q) ? acc : acc + q;
    }, 0);
    return [{ opening, income, expense, closing: opening + income - expense } as TurnoverRow];
  }

  const by = [...opts.groupBy];
  const [openingIncome, openingExpense, income, expense] = await Promise.all([
    delegate.groupBy({
      by,
      where: { ...openingWhere, kind: 'income' },
      _sum: { [resourceKey]: true },
    }),
    delegate.groupBy({
      by,
      where: { ...openingWhere, kind: 'expense' },
      _sum: { [resourceKey]: true },
    }),
    delegate.groupBy({
      by,
      where: incomeWhere,
      _sum: { [resourceKey]: true },
    }),
    delegate.groupBy({
      by,
      where: expenseWhere,
      _sum: { [resourceKey]: true },
    }),
  ]);

  const keyOf = (r: Record<string, unknown>) => by.map((g) => String(r[g])).join('||');
  const rowFor = (map: Map<string, TurnoverRow>, row: Record<string, unknown>): TurnoverRow => {
    const k = keyOf(row);
    let existing = map.get(k);
    if (!existing) {
      existing = { opening: 0, income: 0, expense: 0, closing: 0 } as TurnoverRow;
      for (const g of by) existing[g] = row[g];
      map.set(k, existing);
    }
    return existing;
  };
  const sum = (row: Record<string, unknown>) =>
    Number(((row._sum ?? {}) as Record<string, unknown>)[resourceKey] ?? 0);

  const out = new Map<string, TurnoverRow>();
  for (const r of openingIncome) rowFor(out, r).opening += sum(r);
  for (const r of openingExpense) rowFor(out, r).opening -= sum(r);
  for (const r of income) rowFor(out, r).income += sum(r);
  for (const r of expense) rowFor(out, r).expense += sum(r);
  for (const row of out.values()) {
    row.closing = row.opening + row.income - row.expense;
  }
  return [...out.values()];
}

/**
 * Compute the register's signed primary-resource balance at a point in time.
 *
 * "As of T" is cumulative from history's start through T inclusive. Any
 * caller-supplied `timestamp` key on `filter` is stripped so the semantic
 * cannot be silently narrowed by a date range.
 */
export async function balanceAsOf(
  tx: unknown,
  register: AccumulationRegisterConfig,
  filter: Record<string, unknown>,
  asOf: Date,
): Promise<{ quantity: number }> {
  const resourceKey = Object.keys(register.resources)[0];
  if (!resourceKey) throw new Error(`register ${register.id} has no resources`);
  const { timestamp: _stripped, ...rest } = filter;
  const rows = await movementDelegate(tx, register).findMany({
    where: {
      active: true,
      ...rest,
      timestamp: { lte: asOf },
    },
    select: { kind: true, [resourceKey]: true },
  });
  let total = 0;
  for (const row of rows) {
    const qty = Number(row[resourceKey]);
    if (Number.isNaN(qty)) continue;
    total += row.kind === 'expense' ? -qty : qty;
  }
  return { quantity: total };
}
