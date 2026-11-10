import { PeriodClosedError } from './errors';

export type PeriodCloseRow = {
  id: string;
  tenantId: string;
  module: string;
  closedThrough: Date;
  closedBy: string;
  reason: string | null;
};

type Tx = {
  periodClose: {
    findFirst: (args: unknown) => Promise<PeriodCloseRow | null>;
    findMany: (args: unknown) => Promise<PeriodCloseRow[]>;
    upsert: (args: unknown) => Promise<PeriodCloseRow>;
  };
};

/**
 * Throws PeriodClosedError if `docDate` falls on or before the tenant's
 * closed-through date for either the named `module` or the wildcard `*`.
 * Noop when no close record exists.
 */
export async function checkPeriodOpen(
  tx: unknown,
  tenantId: string,
  module: string,
  docDate: Date,
): Promise<void> {
  const bag = tx as Tx;
  const rows = await bag.periodClose.findMany({
    where: { tenantId, module: { in: [module, '*'] } },
    orderBy: { closedThrough: 'desc' },
    take: 1,
  });
  const row = rows[0];
  if (!row) return;
  if (docDate.getTime() <= row.closedThrough.getTime()) {
    throw new PeriodClosedError(row.module, row.closedThrough, docDate);
  }
}

export async function setPeriodClose(
  tx: unknown,
  tenantId: string,
  userId: string,
  module: string,
  closedThrough: Date,
  reason?: string,
): Promise<PeriodCloseRow> {
  const bag = tx as Tx;
  return bag.periodClose.upsert({
    where: { tenantId_module: { tenantId, module } },
    update: { closedThrough, closedBy: userId, reason: reason ?? null },
    create: { tenantId, module, closedThrough, closedBy: userId, reason: reason ?? null },
  });
}

export async function getPeriodClose(tx: unknown, tenantId: string): Promise<PeriodCloseRow[]> {
  const bag = tx as Tx;
  return bag.periodClose.findMany({
    where: { tenantId },
    orderBy: { module: 'asc' },
  });
}
