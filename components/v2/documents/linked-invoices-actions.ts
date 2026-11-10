'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import { type RegisterKey, openBalanceByPartyDoc } from '@/platform/engine/posted-balance-by-doc';

export type OpenInvoice = {
  invoiceId: string;
  balance: number;
  original: number;
  currency: string;
};

/**
 * Load the list of open A/R (or A/P) invoices for a given party. Used by
 * V2 `LinkedInvoicesEditor` so payment forms can show only invoices that
 * still owe money.
 */
export async function loadOpenInvoicesAction(
  partyType: 'customer' | 'supplier',
  partyId: string,
): Promise<OpenInvoice[]> {
  const ctx = await requireTenantContext();
  const register: RegisterKey =
    partyType === 'customer' ? 'sales.accounts_receivable' : 'purchases.accounts_payable';
  const rows = await openBalanceByPartyDoc({
    tenantId: ctx.tenant.id,
    register,
    party: partyId,
  });
  return rows.map((r) => ({
    invoiceId: r.docRef,
    balance: r.amount,
    original: r.original,
    currency: ctx.tenant.currency,
  }));
}
