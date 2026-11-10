import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { sendPaymentReceivedEmail } from '@/platform/email/send-payment-received';
import { normalizeEmailLocale } from './locale';
import { getNotificationSettings } from './settings';

interface PaymentLookupTx {
  document_sales_payment_received: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; date: true; customer: true; amount: true };
    }) => Promise<{ id: string; date: Date; customer: string; amount: unknown } | null>;
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

export async function dispatchPaymentReceived(
  tenantId: string,
  paymentDocId: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[notifications] RESEND_API_KEY not set — payment-received email skipped', {
      tenantId,
    });
    return;
  }

  const settings = await getNotificationSettings(tenantId);
  if (!settings.paymentReceived) return;

  const inner = await withTenant(tenantId, async (txRaw) => {
    const tx = txRaw as unknown as PaymentLookupTx;
    const doc = await tx.document_sales_payment_received.findUnique({
      where: { id: paymentDocId },
      select: { id: true, date: true, customer: true, amount: true },
    });
    if (!doc) return null;
    const customer = await tx.catalog_sales_customer.findUnique({
      where: { id: doc.customer },
      select: { id: true, name: true, email: true },
    });
    return { doc, customer };
  });

  if (!inner?.doc || !inner.customer?.email) return;

  const tenant = await withBypass(async (txRaw) => {
    const tx = txRaw as unknown as TenantTx;
    return tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, defaultLocale: true, currency: true },
    });
  });
  if (!tenant) return;

  const locale = normalizeEmailLocale(tenant.defaultLocale);
  const amount = Number(inner.doc.amount);

  await sendPaymentReceivedEmail({
    to: inner.customer.email,
    workspaceName: tenant.name,
    customerName: inner.customer.name,
    amount: amount.toFixed(2),
    currency: tenant.currency,
    receivedAt: inner.doc.date.toISOString().slice(0, 10),
    locale,
  });
}
