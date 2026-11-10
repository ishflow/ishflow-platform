import { withBypass } from '@/platform/db/tenant-context';
/**
 * Stripe `customer.subscription.deleted` handler.
 *
 * Fires when a subscription is fully terminated (after `current_period_end`
 * if `cancel_at_period_end` was true, or immediately on hard cancel). For v1
 * we downgrade the tenant to 'free' immediately. A future cron can defer
 * the plan flip to `current_period_end` to honour pre-paid time without
 * changing this handler's shape.
 */
import type Stripe from 'stripe';
import { extractCustomerId } from './_helpers';

export async function handleSubscriptionDeleted(
  event: Stripe.Event,
): Promise<{ tenantId: string | null }> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = extractCustomerId(subscription.customer);
  if (!customerId) return { tenantId: null };

  const tenant = await withBypass((tx) =>
    tx.tenant.findFirst({ where: { stripeCustomerId: customerId } }),
  );
  if (!tenant) return { tenantId: null };

  await withBypass((tx) =>
    tx.tenant.update({
      where: { id: tenant.id },
      data: {
        plan: 'free',
        status: 'cancelled',
        stripeSubscriptionId: null,
        trialEndsAt: null,
      },
    }),
  );

  return { tenantId: tenant.id };
}
