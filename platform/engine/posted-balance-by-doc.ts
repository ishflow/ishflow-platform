import { withTenant } from '@/platform/db/tenant-context';

export type RegisterKey = 'sales.accounts_receivable' | 'purchases.accounts_payable';

export type OpenBalanceRow = {
  /** The originating invoice id (the document that opened the balance). */
  docRef: string;
  /** Remaining balance in base currency. */
  amount: number;
  /** Remaining balance in the original currency. */
  original: number;
  /** Original currency code (e.g. "USD"). */
  currency: string;
};

/**
 * Aggregate signed entries on the A/R or A/P register grouped by the
 * originating invoice document, then return only rows that still have a
 * positive remaining balance (i.e. open invoices).
 *
 * - The invoice's own income entry posts with `docRef = <invoice_id>` and
 *   no `relatedDocRef`.
 * - Payment expense entries post with `relatedDocRef = <invoice_id>`.
 *
 * So the "originating invoice" group key is `relatedDocRef ?? docRef`
 * for every active entry.
 *
 * Used by the V2 `LinkedInvoicesEditor` so payment forms know which
 * invoices remain open per customer/supplier.
 */
export async function openBalanceByPartyDoc({
  tenantId,
  register,
  party,
}: {
  tenantId: string;
  register: RegisterKey;
  party: string;
}): Promise<OpenBalanceRow[]> {
  return withTenant(tenantId, async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: tx delegate is dynamic per register
    const bag = tx as any;
    const delegate =
      register === 'sales.accounts_receivable'
        ? bag.movement_sales_accounts_receivable
        : bag.movement_purchases_accounts_payable;
    const partyCol = register === 'sales.accounts_receivable' ? 'customer' : 'supplier';

    // Single currency per tenant (multi-currency removed). Label balances with
    // the tenant's currency, not a hardcoded 'USD'. Finding D9.
    const tenantRow = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { currency: true },
    });
    const cur = tenantRow?.currency ?? 'USD';

    const rows: Array<{
      kind: string;
      amount: unknown;
      docRef: string;
      relatedDocRef: string | null;
    }> = await delegate.findMany({
      where: {
        [partyCol]: party,
        active: true,
      },
      select: {
        kind: true,
        amount: true,
        docRef: true,
        relatedDocRef: true,
      },
    });

    const acc = new Map<string, { amount: number; original: number; currency: string }>();
    for (const r of rows) {
      const key = r.relatedDocRef ?? r.docRef;
      const sign = r.kind === 'income' ? 1 : -1;
      const amt = Number(r.amount);
      const orig = amt;
      const entry = acc.get(key) ?? { amount: 0, original: 0, currency: cur };
      entry.amount += sign * amt;
      entry.original += sign * orig;
      acc.set(key, entry);
    }

    return Array.from(acc.entries())
      .filter(([, e]) => e.amount > 0.001)
      .map(([docRef, e]) => ({
        docRef,
        amount: e.amount,
        original: e.original,
        currency: e.currency,
      }));
  });
}

/**
 * Per-invoice open balance for a fixed set of invoice ids. One query, no
 * party filter. Returns a Map keyed by the originating invoice id — entries
 * with non-positive balance are omitted, so absence ≡ fully settled / no debt.
 *
 * Used by V2 invoice list pages to decide whether to surface the "new
 * payment" row action and what amount to prefill.
 */
export async function openBalancesForDocs({
  tenantId,
  register,
  invoiceIds,
}: {
  tenantId: string;
  register: RegisterKey;
  invoiceIds: string[];
}): Promise<Map<string, { amount: number; original: number; currency: string }>> {
  const out = new Map<string, { amount: number; original: number; currency: string }>();
  if (invoiceIds.length === 0) return out;
  return withTenant(tenantId, async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: tx delegate is dynamic per register
    const bag = tx as any;
    const delegate =
      register === 'sales.accounts_receivable'
        ? bag.movement_sales_accounts_receivable
        : bag.movement_purchases_accounts_payable;

    // Single currency per tenant — label with the tenant currency. Finding D9.
    const tenantRow = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { currency: true },
    });
    const cur = tenantRow?.currency ?? 'USD';

    const rows: Array<{
      kind: string;
      amount: unknown;
      docRef: string;
      relatedDocRef: string | null;
    }> = await delegate.findMany({
      where: {
        active: true,
        OR: [{ docRef: { in: invoiceIds } }, { relatedDocRef: { in: invoiceIds } }],
      },
      select: {
        kind: true,
        amount: true,
        docRef: true,
        relatedDocRef: true,
      },
    });

    const acc = new Map<string, { amount: number; original: number; currency: string }>();
    for (const r of rows) {
      const key = r.relatedDocRef ?? r.docRef;
      const sign = r.kind === 'income' ? 1 : -1;
      const amt = Number(r.amount);
      const orig = amt;
      const entry = acc.get(key) ?? { amount: 0, original: 0, currency: cur };
      entry.amount += sign * amt;
      entry.original += sign * orig;
      acc.set(key, entry);
    }

    for (const [key, e] of acc) {
      if (e.amount > 0.001 && invoiceIds.includes(key)) {
        out.set(key, { amount: e.amount, original: e.original, currency: e.currency });
      }
    }
    return out;
  });
}
