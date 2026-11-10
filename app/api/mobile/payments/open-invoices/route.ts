import '@/configs/purchases/documents/payment-sent';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/sales/documents/payment-received';
import '@/configs/sales/documents/sales-invoice';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { OpenInvoicesQuerySchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EPSILON = 0.001;

export async function GET(req: Request): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = OpenInvoicesQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid query' }, { status: 400 });
  }

  const { counterpartyId, direction } = parsed.data;
  const tenantId = app.tenant.id;

  const isReceivable = direction === 'receivable';
  const movementModel = isReceivable
    ? 'movement_sales_accounts_receivable'
    : 'movement_purchases_accounts_payable';
  const counterpartyField = isReceivable ? 'customer' : 'supplier';
  const invoiceDocType = isReceivable ? 'sales.invoice' : 'purchases.invoice';
  const paymentDocType = isReceivable ? 'sales.payment_received' : 'purchases.payment_sent';
  const invoiceTable = isReceivable
    ? 'document_sales_invoice'
    : 'document_purchases_invoice';

  const movements = await withTenant(tenantId, async (tx) => {
    const delegate = (tx as Record<string, unknown>)[movementModel] as {
      findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
    };
    return delegate.findMany({
      where: { tenantId, [counterpartyField]: counterpartyId },
      orderBy: { createdAt: 'asc' },
    });
  });

  // Group invoice movements by docRef → total amount.
  const invoiceTotalById = new Map<string, number>();
  // Group linked payment movements by relatedDocRef → paid amount.
  const paidByInvoiceId = new Map<string, number>();
  // Track unmatched (legacy) payment amounts for FIFO allocation.
  const unmatchedPayments: Array<{ docRef: string; amount: number; timestamp: Date }> = [];

  for (const m of movements) {
    const docType = String(m.docType);
    const amount = Number(m.amount);
    if (!Number.isFinite(amount)) continue;

    if (docType === invoiceDocType) {
      const docRef = String(m.docRef);
      invoiceTotalById.set(docRef, (invoiceTotalById.get(docRef) ?? 0) + amount);
    } else if (docType === paymentDocType) {
      const relatedDocRef = m.relatedDocRef ? String(m.relatedDocRef) : null;
      if (relatedDocRef) {
        paidByInvoiceId.set(relatedDocRef, (paidByInvoiceId.get(relatedDocRef) ?? 0) + amount);
      } else {
        unmatchedPayments.push({
          docRef: String(m.docRef),
          amount,
          timestamp: new Date(String(m.timestamp)),
        });
      }
    }
  }

  // Allocate unmatched legacy payments across open invoices using FIFO.
  if (unmatchedPayments.length > 0) {
    unmatchedPayments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const openInvoices = Array.from(invoiceTotalById.entries())
      .map(([invoiceId, total]) => ({
        invoiceId,
        open: total - (paidByInvoiceId.get(invoiceId) ?? 0),
      }))
      .filter((r) => r.open > EPSILON)
      .sort((a, b) => {
        // Oldest invoices first for FIFO allocation.
        const aTime = movements.find((m) => m.docRef === a.invoiceId)?.timestamp ?? new Date();
        const bTime = movements.find((m) => m.docRef === b.invoiceId)?.timestamp ?? new Date();
        return new Date(String(aTime)).getTime() - new Date(String(bTime)).getTime();
      });

    for (const payment of unmatchedPayments) {
      let remaining = payment.amount;
      for (const inv of openInvoices) {
        if (remaining <= EPSILON) break;
        if (inv.open <= EPSILON) continue;
        const allocate = Math.min(remaining, inv.open);
        inv.open -= allocate;
        remaining -= allocate;
        paidByInvoiceId.set(inv.invoiceId, (paidByInvoiceId.get(inv.invoiceId) ?? 0) + allocate);
      }
    }
  }

  // Compute open amounts and filter positive ones.
  const openRows: Array<{
    invoiceId: string;
    totalAmount: number;
    paidAmount: number;
    openAmount: number;
  }> = [];

  for (const [invoiceId, totalAmount] of invoiceTotalById) {
    const paidAmount = paidByInvoiceId.get(invoiceId) ?? 0;
    const openAmount = totalAmount - paidAmount;
    if (openAmount > EPSILON) {
      openRows.push({ invoiceId, totalAmount, paidAmount, openAmount });
    }
  }

  if (openRows.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // Hydrate invoice number + date.
  const invoiceIds = openRows.map((r) => r.invoiceId);
  const invoices = await withTenant(tenantId, async (tx) => {
    const delegate = (tx as Record<string, unknown>)[invoiceTable] as {
      findMany: (args: unknown) => Promise<
        Array<{ id: string; number: string; date: Date; currency?: string | null }>
      >;
    };
    return delegate.findMany({
      where: { id: { in: invoiceIds } },
      select: { id: true, number: true, date: true, currency: true },
    });
  });

  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  const baseCurrency = (app.tenant as { currency?: string }).currency ?? 'USD';

  const items = openRows.map((r) => {
    const inv = invoiceById.get(r.invoiceId);
    return {
      invoiceId: r.invoiceId,
      documentType: invoiceDocType,
      invoiceNumber: inv?.number ?? '',
      invoiceDate: inv?.date ? new Date(inv.date).toISOString() : new Date().toISOString(),
      totalAmount: r.totalAmount,
      paidAmount: r.paidAmount,
      openAmount: r.openAmount,
      currency: inv?.currency ?? baseCurrency,
    };
  });

  const body: { items: Array<Record<string, unknown>> } = { items };
  return NextResponse.json(body);
}
