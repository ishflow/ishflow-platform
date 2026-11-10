import { describe, expect, it } from 'vitest';
import { accountsReceivableView } from './accounts-receivable';

type LoaderArgs = Parameters<typeof accountsReceivableView.loader>[0];

function makeCtx(opts: {
  grouped: Array<{ customer: string; kind: string; _sum: { amount: number } }>;
  movements: unknown[];
  customers?: Array<{ id: string; name: string }>;
  chip?: string | null;
}): LoaderArgs {
  const arDelegate = {
    groupBy: async () => opts.grouped,
    aggregate: async () => ({ _sum: { amount: 0 } }),
    findMany: async () => opts.movements,
  };
  const tx = {
    movement_sales_accounts_receivable: arDelegate,
    document_sales_invoice: { findMany: async () => [] as unknown[] },
    catalog_sales_customer: { findMany: async () => opts.customers ?? [] },
  } as unknown as LoaderArgs['tx'];

  return {
    tenant: { id: 't1', locale: 'tr', currency: 'TRY' },
    tx,
    period: {
      kind: 'month',
      year: 2026,
      month: 5,
      start: new Date(Date.UTC(2026, 4, 1)),
      end: new Date(Date.UTC(2026, 5, 1)),
    },
    chip: opts.chip ?? null,
    search: null,
    page: 1,
  };
}

describe('accounts-receivable loader · empty state', () => {
  it('shows a settled empty-state when balances net to zero but movements exist', async () => {
    const out = await accountsReceivableView.loader(
      makeCtx({
        grouped: [
          { customer: 'c1', kind: 'income', _sum: { amount: 1200 } },
          { customer: 'c1', kind: 'expense', _sum: { amount: 1200 } },
        ],
        movements: [{ id: 'm1' }, { id: 'm2' }],
      }),
    );
    expect(out.rows).toHaveLength(0);
    expect(out.emptyState).toBeDefined();
    expect(out.emptyState?.title).toBe('Açık alacak yok');
    expect(out.emptyState?.subtitle).toContain('2');
    expect(out.emptyState?.actions?.[0]?.href).toBe('?chip=movements');
  });

  it('omits the empty-state when an open balance exists', async () => {
    const out = await accountsReceivableView.loader(
      makeCtx({
        grouped: [{ customer: 'c1', kind: 'income', _sum: { amount: 1000 } }],
        movements: [{ id: 'm1' }],
        customers: [{ id: 'c1', name: 'Acme' }],
      }),
    );
    expect(out.rows.length).toBeGreaterThan(0);
    expect(out.emptyState).toBeUndefined();
  });
});
