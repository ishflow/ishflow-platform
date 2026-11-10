import { withBypass } from '@/platform/db/tenant-context';
/**
 * Stripe `customer.subscription.created` handler.
 *
 * Sets the tenant's plan, status, stripeSubscriptionId, and trialEndsAt based
 * on the new Stripe Subscription. The mapping from Stripe Price → plan is
 * driven entirely by `Price.metadata.plan` (set by the seeder script) so we
 * never have to ship a Price-ID table in code.
 */
import type Stripe from 'stripe';
import { extractCustomerId, mapPriceToPlan } from './_helpers';

export async function handleSubscriptionCreated(
  event: Stripe.Event,
): Promise<{ tenantId: string | null }> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = extractCustomerId(subscription.customer);
  if (!customerId) return { tenantId: null };

  const tenant = await withBypass((tx) =>
    tx.tenant.findFirst({ where: { stripeCustomerId: customerId } }),
  );
  if (!tenant) return { tenantId: null };

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) throw new Error('subscription has no price');
  const plan = await mapPriceToPlan(priceId);

  await withBypass((tx) =>
    tx.tenant.update({
      where: { id: tenant.id },
      data: {
        plan,
        stripeSubscriptionId: subscription.id,
        status: subscription.status === 'trialing' ? 'trialing' : 'active',
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      },
    }),
  );

  return { tenantId: tenant.id };
}
