/**
 * Server-side helper: list "open" invoices the bank-import matcher should
 * consider. An invoice is open when it has at least one accounts_receivable
 * (or accounts_payable) movement AND the sum of payment movements still
 * leaves a positive balance.
 *
 * Mirrors the math used by `/api/mobile/payments/open-invoices` but returns
 * `OpenInvoiceCandidate` records ready to feed into `matchRow`.
 */

import type { OpenInvoiceCandidate } from './match';

const EPSILON = 0.001;

type Tx = Record<string, unknown>;

type MovementRow = {
  docType: string;
  docRef: string;
  amount: number | string;
  relatedDocRef: string | null;
  customer?: string | null;
  supplier?: string | null;
  timestamp: Date;
};

type InvoiceRow = {
  id: string;
  date: Date;
  currency: string | null;
  customer?: string | null;
  supplier?: string | null;
};

type CounterpartyRow = {
  id: string;
  name: string | null;
};

function delegate<T>(tx: Tx, key: string): T {
  const d = tx[key] as T | undefined;
  if (!d) throw new Error(`open-invoices: no Prisma model for ${key}`);
  return d;
}

/**
 * Find every open invoice for the tenant in a given direction + currency.
 *
 *   direction === 'in'  → sales.invoice (A/R)
 *   direction === 'out' → purchases.invoice (A/P)
 *
 * `currency` filters out invoices in other currencies — multi-currency
 * matching is out of scope for v1.
 */
export async function findOpenInvoices(
  tx: Tx,
  tenantId: string,
  direction: 'in' | 'out',
  currency: string,
): Promise<OpenInvoiceCandidate[]> {
  const isReceivable = direction === 'in';
  const movementKey = isReceivable
    ? 'movement_sales_accounts_receivable'
    : 'movement_purchases_accounts_payable';
  const invoiceKey = isReceivable ? 'document_sales_invoice' : 'document_purchases_invoice';
  const counterpartyKey = isReceivable ? 'catalog_sales_customer' : 'catalog_purchases_supplier';
  const counterpartyField = isReceivable ? 'customer' : 'supplier';
  const invoiceDocType = isReceivable ? 'sales.invoice' : 'purchases.invoice';
  const paymentDocType = isReceivable ? 'sales.payment_received' : 'purchases.payment_sent';

  const movementDelegate = delegate<{
    findMany: (args: unknown) => Promise<MovementRow[]>;
  }>(tx, movementKey);
  const movements = await movementDelegate.findMany({
    where: { tenantId, active: true },
    select: {
      docType: true,
      docRef: true,
      amount: true,
      relatedDocRef: true,
      timestamp: true,
      [counterpartyField]: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const invoiceTotalById = new Map<string, number>();
  const paidByInvoiceId = new Map<string, number>();
  const unmatchedPayments: Array<{ amount: number; timestamp: Date }> = [];

  for (const m of movements) {
    const amount = Number(m.amount);
    if (!Number.isFinite(amount)) continue;
    if (m.docType === invoiceDocType) {
      invoiceTotalById.set(m.docRef, (invoiceTotalById.get(m.docRef) ?? 0) + amount);
    } else if (m.docType === paymentDocType) {
      if (m.relatedDocRef) {
        paidByInvoiceId.set(m.relatedDocRef, (paidByInvoiceId.get(m.relatedDocRef) ?? 0) + amount);
      } else {
        unmatchedPayments.push({ amount, timestamp: m.timestamp });
      }
    }
  }

  // FIFO-allocate unlinked legacy payments across the oldest open invoices.
  if (unmatchedPayments.length > 0) {
    const openIds = Array.from(invoiceTotalById.keys());
    unmatchedPayments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const sortedOpen = openIds
      .map((id) => ({
        id,
        open: (invoiceTotalById.get(id) ?? 0) - (paidByInvoiceId.get(id) ?? 0),
      }))
      .filter((r) => r.open > EPSILON);
    for (const payment of unmatchedPayments) {
      let remaining = payment.amount;
      for (const inv of sortedOpen) {
        if (remaining <= EPSILON) break;
        if (inv.open <= EPSILON) continue;
        const alloc = Math.min(remaining, inv.open);
        inv.open -= alloc;
        remaining -= alloc;
        paidByInvoiceId.set(inv.id, (paidByInvoiceId.get(inv.id) ?? 0) + alloc);
      }
    }
  }

  const openRows: Array<{ id: string; openAmount: number }> = [];
  for (const [id, total] of invoiceTotalById) {
    const paid = paidByInvoiceId.get(id) ?? 0;
    const open = total - paid;
    if (open > EPSILON) openRows.push({ id, openAmount: open });
  }
  if (openRows.length === 0) return [];

  const invoiceIds = openRows.map((r) => r.id);
  const invoiceDelegate = delegate<{
    findMany: (args: unknown) => Promise<InvoiceRow[]>;
  }>(tx, invoiceKey);
  const invoices = await invoiceDelegate.findMany({
    where: { id: { in: invoiceIds }, tenantId },
    select: {
      id: true,
      date: true,
      currency: true,
      [counterpartyField]: true,
    },
  });
  const invoiceById = new Map(invoices.map((i) => [i.id, i] as const));

  const counterpartyIds = Array.from(
    new Set(
      invoices
        .map((i) => (counterpartyField === 'customer' ? i.customer : i.supplier))
        .filter((v): v is string => typeof v === 'string' && v.length > 0),
    ),
  );

  let counterpartyById = new Map<string, CounterpartyRow>();
  if (counterpartyIds.length > 0) {
    const counterpartyDelegate = delegate<{
      findMany: (args: unknown) => Promise<CounterpartyRow[]>;
    }>(tx, counterpartyKey);
    const counterparties = await counterpartyDelegate.findMany({
      where: { id: { in: counterpartyIds }, tenantId },
      select: { id: true, name: true },
    });
    counterpartyById = new Map(counterparties.map((c) => [c.id, c] as const));
  }

  const candidates: OpenInvoiceCandidate[] = [];
  for (const row of openRows) {
    const inv = invoiceById.get(row.id);
    if (!inv) continue;
    const invCurrency = inv.currency ?? currency;
    if (invCurrency !== currency) continue;
    const counterpartyId = (counterpartyField === 'customer' ? inv.customer : inv.supplier) ?? '';
    if (!counterpartyId) continue;
    const cp = counterpartyById.get(counterpartyId);
    candidates.push({
      id: inv.id,
      docType: invoiceDocType as 'sales.invoice' | 'purchases.invoice',
      date: new Date(inv.date),
      openAmount: row.openAmount,
      counterpartyId,
      counterpartyName: cp?.name ?? null,
      // Customers/suppliers don't currently carry INN; future schema may add
      // it and the matcher will pick it up automatically via row.counterpartyInn.
      counterpartyInn: null,
      currency: invCurrency,
    });
  }
  return candidates;
}
