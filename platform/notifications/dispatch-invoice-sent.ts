import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { sendInvoiceSentEmail } from '@/platform/email/send-invoice-sent';
import { WEB_BASE_URL, normalizeEmailLocale } from './locale';
import { getNotificationSettings } from './settings';

interface SalesInvoiceLineRow {
  quantity: number;
  price: unknown;
}

interface InvoiceLookupTx {
  document_sales_invoice: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; number: true; customer: true };
    }) => Promise<{ id: string; number: string; customer: string } | null>;
  };
  document_line_sales_invoice_items: {
    findMany: (args: {
      where: { documentId: string };
      select: { quantity: true; price: true };
    }) => Promise<SalesInvoiceLineRow[]>;
  };
  catalog_sales_customer: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; name: true; email: true };
    }) => Promise<{ id: string; name: string; email: string | null } | null>;
  };
}

interface TenantTx {
  tenant: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; name: true; defaultLocale: true; currency: true };
    }) => Promise<{ id: string; name: string; defaultLocale: string; currency: string } | null>;
  };
}

export async function dispatchInvoiceSent(tenantId: string, invoiceId: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[notifications] RESEND_API_KEY not set — invoice-sent email skipped', {
      tenantId,
    });
    return;
  }

  const settings = await getNotificationSettings(tenantId);
  if (!settings.invoiceSent) return;

  const ctx = await withTenant(tenantId, async (txRaw) => {
    const tx = txRaw as unknown as InvoiceLookupTx;
    const invoice = await tx.document_sales_invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, number: true, customer: true },
    });
    if (!invoice) return { invoice: null, lines: [] as SalesInvoiceLineRow[], customer: null };
    const [lines, customer] = await Promise.all([
      tx.document_line_sales_invoice_items.findMany({
        where: { documentId: invoiceId },
        select: { quantity: true, price: true },
      }),
      tx.catalog_sales_customer.findUnique({
        where: { id: invoice.customer },
        select: { id: true, name: true, email: true },
      }),
    ]);
    return { invoice, lines, customer };
  });

  if (!ctx.invoice || !ctx.customer?.email) return;

  // Tenant lookup outside RLS — tenant table is keyed by id (no cross-tenant
  // ambiguity) and RLS would need its own session variable to read its own row.
  const tenant = await withBypass(async (txRaw) => {
    const tx = txRaw as unknown as TenantTx;
    return tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, defaultLocale: true, currency: true },
    });
  });
  if (!tenant) return;

  const total = ctx.lines.reduce((sum, ln) => sum + ln.quantity * Number(ln.price), 0);
  const locale = normalizeEmailLocale(tenant.defaultLocale);
  const invoiceUrl = `${WEB_BASE_URL}/${locale}/sales/invoices/${invoiceId}`;

  await sendInvoiceSentEmail({
    to: ctx.customer.email,
    workspaceName: tenant.name,
    customerName: ctx.customer.name,
    invoiceNumber: ctx.invoice.number,
    totalAmount: total.toFixed(2),
    currency: tenant.currency,
    invoiceUrl,
    locale,
  });
}
