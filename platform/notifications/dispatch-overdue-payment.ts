import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { sendOverduePaymentEmail } from '@/platform/email/send-overdue-payment';
import { WEB_BASE_URL, normalizeEmailLocale } from './locale';
import { getNotificationSettings } from './settings';

interface InvoiceRow {
  id: string;
  number: string;
  date: Date;
  customer: string;
}

interface OverdueTx {
  document_sales_invoice: {
    findMany: (args: {
      where: { deletedAt: null; status: 'POSTED'; date: { lt: Date } };
      select: { id: true; number: true; date: true; customer: true };
      orderBy: { date: 'asc' };
    }) => Promise<InvoiceRow[]>;
  };
  document_line_sales_invoice_items: {
    findMany: (args: {
      where: { documentId: { in: string[] } };
      select: { documentId: true; quantity: true; price: true };
    }) => Promise<Array<{ documentId: string; quantity: number; price: unknown }>>;
  };
  document_sales_payment_received: {
    findMany: (args: {
      where: { deletedAt: null; status: 'POSTED'; linkedInvoices: { not: null } };
      select: { linkedInvoices: true };
    }) => Promise<Array<{ linkedInvoices: string | null }>>;
  };
  catalog_sales_customer: {
    findMany: (args: {
      where: { id: { in: string[] } };
      select: { id: true; name: true; email: true };
    }) => Promise<Array<{ id: string; name: string; email: string | null }>>;
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

function parseLinked(raw: string | null): Array<{ invoiceId: string; amount: number }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is { invoiceId: string; amount: number } =>
        x && typeof x.invoiceId === 'string' && typeof x.amount === 'number',
    );
  } catch {
    return [];
  }
}

function daysBetween(now: Date, then: Date): number {
  const ms = now.getTime() - then.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchOverduePayment(
  tenantId: string,
  now: Date = new Date(),
): Promise<{ emails: number }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[notifications] RESEND_API_KEY not set — overdue email skipped', { tenantId });
    return { emails: 0 };
  }

  const settings = await getNotificationSettings(tenantId);
  if (!settings.overduePayment) return { emails: 0 };

  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - settings.overdueDaysThreshold);

  // RLS-scoped reads for every tenant-owned table.
  const data = await withTenant(tenantId, async (txRaw) => {
    const tx = txRaw as unknown as OverdueTx;

    const invoices = await tx.document_sales_invoice.findMany({
      where: { deletedAt: null, status: 'POSTED', date: { lt: cutoff } },
      select: { id: true, number: true, date: true, customer: true },
      orderBy: { date: 'asc' },
    });
    if (invoices.length === 0) {
      return {
        invoices: [] as InvoiceRow[],
        totals: new Map<string, number>(),
        payments: new Map<string, number>(),
        customers: new Map<string, { name: string; email: string | null }>(),
      };
    }

    const invoiceIds = invoices.map((i) => i.id);
    const customerIds = Array.from(new Set(invoices.map((i) => i.customer)));

    const [lines, payments, customers] = await Promise.all([
      tx.document_line_sales_invoice_items.findMany({
        where: { documentId: { in: invoiceIds } },
        select: { documentId: true, quantity: true, price: true },
      }),
      tx.document_sales_payment_received.findMany({
        where: { deletedAt: null, status: 'POSTED', linkedInvoices: { not: null } },
        select: { linkedInvoices: true },
      }),
      tx.catalog_sales_customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true, email: true },
      }),
    ]);

    const totals = new Map<string, number>();
    for (const ln of lines) {
      totals.set(ln.documentId, (totals.get(ln.documentId) ?? 0) + ln.quantity * Number(ln.price));
    }

    const paid = new Map<string, number>();
    for (const p of payments) {
      for (const li of parseLinked(p.linkedInvoices)) {
        paid.set(li.invoiceId, (paid.get(li.invoiceId) ?? 0) + li.amount);
      }
    }

    const customerMap = new Map<string, { name: string; email: string | null }>(
      customers.map((c) => [c.id, { name: c.name, email: c.email }]),
    );

    return { invoices, totals, payments: paid, customers: customerMap };
  });

  if (data.invoices.length === 0) return { emails: 0 };

  const tenant = await withBypass(async (txRaw) => {
    const tx = txRaw as unknown as TenantTx;
    return tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, defaultLocale: true, currency: true },
    });
  });
  if (!tenant) return { emails: 0 };

  const locale = normalizeEmailLocale(tenant.defaultLocale);

  let emails = 0;
  for (const inv of data.invoices) {
    const total = data.totals.get(inv.id) ?? 0;
    const paid = data.payments.get(inv.id) ?? 0;
    const outstanding = total - paid;
    if (outstanding <= 0.001) continue;

    const days = daysBetween(now, inv.date);
    const sinceThreshold = days - settings.overdueDaysThreshold;
    if (sinceThreshold < 0) continue;
    if (sinceThreshold % 7 !== 0) continue;

    const customer = data.customers.get(inv.customer);
    if (!customer?.email) continue;

    try {
      await sendOverduePaymentEmail({
        to: customer.email,
        workspaceName: tenant.name,
        customerName: customer.name,
        invoiceNumber: inv.number,
        daysOverdue: days,
        amount: outstanding.toFixed(2),
        currency: tenant.currency,
        invoiceUrl: `${WEB_BASE_URL}/${locale}/sales/invoices/${inv.id}`,
        locale,
      });
      emails += 1;
      await sleep(110); // gentle throttle for Resend free-tier 10 req/s
    } catch (err) {
      console.warn('[notifications] overdue email failed', {
        tenantId,
        invoiceId: inv.id,
        err,
      });
    }
  }

  return { emails };
}
