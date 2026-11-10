import { describe, expect, it } from 'vitest';
import { cashFundsView } from './cash-funds';

type LoaderArgs = Parameters<typeof cashFundsView.loader>[0];

function makeCtx(
  overrides: Partial<Omit<LoaderArgs, 'tx'>> & { txOverrides?: Partial<LoaderArgs['tx']> } = {},
): LoaderArgs {
  const baseTx = {
    $queryRawUnsafe: async () => [] as unknown[],
    movement_treasury_cash_funds: {
      findMany: async () => [] as unknown[],
      groupBy: async () => [] as unknown[],
    },
  } as unknown as LoaderArgs['tx'];

  const base: LoaderArgs = {
    tenant: { id: 't1', locale: 'tr', currency: 'TRY' },
    tx: baseTx,
    period: {
      kind: 'month',
      year: 2026,
      month: 5,
      start: new Date(Date.UTC(2026, 4, 1)),
      end: new Date(Date.UTC(2026, 5, 1)),
    },
    chip: null,
    search: null,
    page: 1,
  };

  const merged: LoaderArgs = {
    ...base,
    ...overrides,
    tx: {
      ...(base.tx as object),
      ...((overrides.txOverrides ?? {}) as object),
    } as LoaderArgs['tx'],
  };
  return merged;
}

describe('cashFundsView', () => {
  it('is registered with id cash-funds', () => {
    expect(cashFundsView.id).toBe('cash-funds');
    expect(cashFundsView.register).toBe('treasury.cash_funds');
  });

  it('handles empty data — KPIs are zero, rows empty', async () => {
    const ctx = makeCtx();
    const out = await cashFundsView.loader(ctx);
    expect(out.rows).toHaveLength(0);
    expect(out.kpis.find((k) => k.id === 'totalCash')?.value).toMatch(/0/);
    expect(out.kpis.find((k) => k.id === 'activeRegisters')?.value).toBe('0');
  });

  it('sums opening + income − expense for totalCash', async () => {
    const txOverrides = {
      $queryRawUnsafe: async () => [{ id: 'r1', code: 'K-001', name: 'Main', openingBalance: 100 }],
      movement_treasury_cash_funds: {
        findMany: async () => [
          {
            id: 'm1',
            cashRegister: 'r1',
            kind: 'income',
            amount: 50,
            timestamp: new Date('2026-05-15'),
            relatedDocRef: null,
            createdAt: new Date(),
          },
          {
            id: 'm2',
            cashRegister: 'r1',
            kind: 'expense',
            amount: 30,
            timestamp: new Date('2026-05-16'),
            relatedDocRef: null,
            createdAt: new Date(),
          },
        ],
        groupBy: async () => [
          { cashRegister: 'r1', kind: 'income', _sum: { amount: 50 } },
          { cashRegister: 'r1', kind: 'expense', _sum: { amount: 30 } },
        ],
      },
    } as unknown as Partial<LoaderArgs['tx']>;
    const ctx = makeCtx({ txOverrides });
    const out = await cashFundsView.loader(ctx);
    expect(out.kpis.find((k) => k.id === 'totalCash')?.value).toMatch(/120/);
    expect(out.kpis.find((k) => k.id === 'periodIncome')?.value).toMatch(/50/);
    expect(out.kpis.find((k) => k.id === 'periodExpense')?.value).toMatch(/30/);
    expect(out.rows).toHaveLength(2);
  });

  it('chip=income filters movements to income only', async () => {
    const txOverrides = {
      $queryRawUnsafe: async () => [{ id: 'r1', code: 'K', name: 'Main', openingBalance: 0 }],
      movement_treasury_cash_funds: {
        findMany: async () => [
          {
            id: 'm1',
            cashRegister: 'r1',
            kind: 'income',
            amount: 50,
            timestamp: new Date('2026-05-15'),
            relatedDocRef: null,
            createdAt: new Date(),
          },
          {
            id: 'm2',
            cashRegister: 'r1',
            kind: 'expense',
            amount: 30,
            timestamp: new Date('2026-05-16'),
            relatedDocRef: null,
            createdAt: new Date(),
          },
        ],
        groupBy: async () => [],
      },
    } as unknown as Partial<LoaderArgs['tx']>;
    const ctx = makeCtx({ chip: 'income', txOverrides });
    const out = await cashFundsView.loader(ctx);
    expect(out.rows).toHaveLength(1);
    expect(out.totalCount).toBe(1);
  });
});
