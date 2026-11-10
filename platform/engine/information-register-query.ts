import type { InformationRegisterConfig } from '@/platform/metadata';

type RegisterDelegate = {
  findFirst: (a: unknown) => Promise<unknown>;
  findMany: (a: unknown) => Promise<unknown[]>;
};

function delegate(tx: unknown, register: InformationRegisterConfig): RegisterDelegate {
  const snake = `register_${register.module}_${register.name}`;
  const camel = `register${cap(register.module)}${cap(register.name)}`;
  const bag = tx as Record<string, RegisterDelegate | undefined>;
  const d = bag[snake] ?? bag[camel];
  if (!d) throw new Error(`information-register-query: no Prisma model for ${snake}`);
  return d;
}

function cap(s: string): string {
  return s.length === 0 ? s : (s[0]?.toUpperCase() ?? '') + s.slice(1);
}

/**
 * 1C `СрезПоследних` for a single dimension tuple. Returns the row with the
 * largest `period <= asOf` matching every dimension equality, ignoring
 * soft-deleted rows. `null` when no row matches.
 */
export async function informationRegisterAt(
  tx: unknown,
  register: InformationRegisterConfig,
  dimensions: Record<string, unknown>,
  asOf: Date,
): Promise<Record<string, unknown> | null> {
  const where = {
    deletedAt: null,
    period: { lte: asOf },
    ...dimensions,
  };
  return (await delegate(tx, register).findFirst({
    where,
    orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
  })) as Record<string, unknown> | null;
}

/**
 * 1C `СрезПоследних` over a partial dimension filter. Returns one row per
 * unique tuple of the *remaining* dimensions. Implemented in JS over a
 * `findMany` rather than a window function — fine for our row counts (a few
 * thousand prices per tenant).
 */
export async function informationRegisterSlice(
  tx: unknown,
  register: InformationRegisterConfig,
  partialDimensions: Record<string, unknown>,
  asOf: Date,
): Promise<Array<Record<string, unknown>>> {
  const allRows = (await delegate(tx, register).findMany({
    where: { deletedAt: null, period: { lte: asOf }, ...partialDimensions },
    orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
  })) as Array<Record<string, unknown>>;
  const dimKeys = Object.keys(register.dimensions).filter((k) => !(k in partialDimensions));
  const seen = new Set<string>();
  const out: Array<Record<string, unknown>> = [];
  for (const row of allRows) {
    const key = dimKeys.map((k) => String(row[k])).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
