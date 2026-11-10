import { withBypass } from '@/platform/db/tenant-context';
/**
 * Stripe `invoice.payment_succeeded` handler.
 *
 * Flips the tenant back to 'active' if dunning previously moved them to
 * 'past_due'. We deliberately do not touch tenants that are already 'active'
 * or 'trialing' — Stripe sends this event on every renewal and we don't
 * want to clobber a manually-set status.
 */
import type Stripe from 'stripe';
import { extractCustomerId } from './_helpers';

export async function handlePaymentSucceeded(
  event: Stripe.Event,
): Promise<{ tenantId: string | null }> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = extractCustomerId(invoice.customer);
  if (!customerId) return { tenantId: null };

  const tenant = await withBypass((tx) =>
    tx.tenant.findFirst({ where: { stripeCustomerId: customerId } }),
  );
  if (!tenant) return { tenantId: null };

  if (tenant.status === 'past_due') {
    await withBypass((tx) =>
      tx.tenant.update({
        where: { id: tenant.id },
        data: { status: 'active' },
      }),
    );
  }

  return { tenantId: tenant.id };
}
