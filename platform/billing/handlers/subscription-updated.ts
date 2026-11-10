import { withBypass } from '@/platform/db/tenant-context';
/**
 * Stripe `customer.subscription.updated` handler.
 *
 * Re-maps the tenant's plan from the active Stripe Price (handles upgrades,
 * downgrades, and plan switches) and reconciles `status` from the Stripe
 * subscription. `cancel_at_period_end=true` keeps the subscription billable
 * until period end — the user still gets paid features until then — so we
 * leave status='active' until the eventual `customer.subscription.deleted`.
 *
 * Stripe → Tenant status mapping:
 *  - 'trialing'                  → 'trialing'
 *  - 'active'                    → 'active'
 *  - 'past_due' | 'unpaid'       → 'past_due'
 *  - 'canceled'                  → 'cancelled' (handled here when Stripe sends an
 *                                  update before the deleted event)
 *  - 'incomplete' | 'incomplete_expired' | 'paused' → 'suspended'
 */
import type { TenantStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { PLAN_RANK } from '../plans';
import { sendDowngradeBlockedEmail } from '../send-downgrade-blocked';
import { wouldViolateLimits } from '../would-violate-limits';
import { extractCustomerId, mapPriceToPlan } from './_helpers';

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): TenantStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'suspended';
    default:
      return 'suspended';
  }
}

export async function handleSubscriptionUpdated(
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
  const status = mapStripeStatus(subscription.status);

  if (PLAN_RANK[plan] < PLAN_RANK[tenant.plan]) {
    const violations = await wouldViolateLimits(tenant, plan);
    const violation = violations[0];
    if (violation) {
      await withBypass((tx) =>
        tx.billingEvent.create({
          data: {
            tenantId: tenant.id,
            stripeEventId: event.id,
            type: 'subscription.downgrade_blocked',
            payload: {
              newPlan: plan,
              kind: violation.kind,
              current: violation.current,
              allowed: violation.newLimit,
            },
            processingError: `usage_exceeds_${violation.kind}_limit`,
            processedAt: new Date(),
          },
        }),
      );
      await sendDowngradeBlockedEmail(tenant.id, plan, violation).catch((err) => {
        console.error('[billing] downgrade-blocked email failed', {
          tenantId: tenant.id,
          err,
        });
      });
      return { tenantId: tenant.id };
    }
  }

  await withBypass((tx) =>
    tx.tenant.update({
      where: { id: tenant.id },
      data: {
        plan,
        stripeSubscriptionId: subscription.id,
        status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      },
    }),
  );

  return { tenantId: tenant.id };
}
