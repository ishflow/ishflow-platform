import { withBypass } from '@/platform/db/tenant-context';
/**
 * Stripe `customer.subscription.trial_will_end` handler.
 *
 * Stripe fires this 3 days before a trial ends. We do NOT mutate Tenant —
 * the BillingEvent row recorded by the dispatcher is the audit trail and
 * `trialEndsAt` already drives the in-app banner. Email delivery is wired
 * by Task 6.1 (Resend integration); that task will import this handler's
 * tenant resolution and call the trial-ending email template.
 */
import type Stripe from 'stripe';
import { sendTrialEndingEmail } from '../send-trial-ending';
import { extractCustomerId } from './_helpers';

export async function handleTrialWillEnd(
  event: Stripe.Event,
): Promise<{ tenantId: string | null }> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = extractCustomerId(subscription.customer);
  if (!customerId) return { tenantId: null };

  const tenant = await withBypass((tx) =>
    tx.tenant.findFirst({ where: { stripeCustomerId: customerId } }),
  );
  if (!tenant) return { tenantId: null };

  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
  const daysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000))
    : 3;
  await sendTrialEndingEmail(tenant.id, daysLeft).catch((err) => {
    console.error('[billing] trial-ending email failed', { tenantId: tenant.id, err });
  });

  return { tenantId: tenant.id };
}
