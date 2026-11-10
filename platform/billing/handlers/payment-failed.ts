import { withBypass } from '@/platform/db/tenant-context';
/**
 * Stripe `invoice.payment_failed` handler.
 *
 * Flips the tenant to 'past_due'. The plan stays the same — we want the user
 * to keep their data and be able to recover by paying the dunning email's
 * invoice. Stripe's smart retries plus our UI banner handle the rest.
 */
import type Stripe from 'stripe';
import { extractCustomerId } from './_helpers';

export async function handlePaymentFailed(
  event: Stripe.Event,
): Promise<{ tenantId: string | null }> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = extractCustomerId(invoice.customer);
  if (!customerId) return { tenantId: null };

  const tenant = await withBypass((tx) =>
    tx.tenant.findFirst({ where: { stripeCustomerId: customerId } }),
  );
  if (!tenant) return { tenantId: null };

  await withBypass((tx) =>
    tx.tenant.update({
      where: { id: tenant.id },
      data: { status: 'past_due' },
    }),
  );

  return { tenantId: tenant.id };
}
