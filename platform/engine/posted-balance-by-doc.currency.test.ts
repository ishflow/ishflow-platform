import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Finding D9: open A/R-A/P balances hardcoded `currency: 'USD'` after
 * multi-currency was removed, so a non-USD tenant (the common case for this
 * RU-market app) saw the wrong currency label on open invoices. The currency
 * should reflect the tenant's configured currency.
 */
const findMany = vi.hoisted(() => vi.fn());
const tenantFindUnique = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: (_tenantId: string, fn: (tx: unknown) => unknown) =>
    fn({
      tenant: { findUnique: tenantFindUnique },
      movement_sales_accounts_receivable: { findMany },
      movement_purchases_accounts_payable: { findMany },
    }),
}));

import { openBalanceByPartyDoc, openBalancesForDocs } from './posted-balance-by-doc';

describe('open-balance currency reflects tenant currency (D9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantFindUnique.mockResolvedValue({ currency: 'RUB' });
    findMany.mockResolvedValue([
      { kind: 'income', amount: 100, docRef: 'inv1', relatedDocRef: null },
    ]);
  });

  it('openBalancesForDocs uses the tenant currency', async () => {
    const out = await openBalancesForDocs({
      tenantId: '11111111-1111-1111-1111-111111111111',
      register: 'sales.accounts_receivable',
      invoiceIds: ['inv1'],
    });
    expect(out.get('inv1')?.currency).toBe('RUB');
  });

  it('openBalanceByPartyDoc uses the tenant currency', async () => {
    const rows = await openBalanceByPartyDoc({
      tenantId: '11111111-1111-1111-1111-111111111111',
      register: 'sales.accounts_receivable',
      party: 'c1',
    });
    expect(rows.find((r) => r.docRef === 'inv1')?.currency).toBe('RUB');
  });
});
