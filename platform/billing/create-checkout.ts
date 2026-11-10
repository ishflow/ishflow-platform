import { withBypass } from '@/platform/db/tenant-context';
import type { Tenant, TenantPlan } from '@prisma/client';
import { stripe } from './stripe-client';
import { type BillingCurrency, type BillingInterval, STRIPE_PRICES } from './stripe-prices';

export interface CreateCheckoutInput {
  tenant: Tenant;
  plan: Exclude<TenantPlan, 'free' | 'enterprise'>;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResult {
  url: string;
}

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'RUB', 'TRY'] as const;

function isBillingCurrency(value: string): value is BillingCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/**
 * Create a Stripe Checkout session for a tenant to subscribe to a paid plan.
 *
 * - Creates a Stripe Customer on first checkout (idempotent: stored on Tenant).
 * - Honors any remaining trial days by passing `trial_period_days` to Stripe.
 * - Enforces that the tenant's currency maps to one of our seeded prices —
 *   falls back to USD if not.
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const currency: BillingCurrency = isBillingCurrency(input.tenant.currency)
    ? input.tenant.currency
    : 'USD';

  const priceId = STRIPE_PRICES[input.plan][input.interval][currency];
  if (!priceId) {
    throw new Error(`No Stripe price configured for ${input.plan} ${input.interval} ${currency}`);
  }

  const s = stripe();

  // Ensure stripeCustomerId.
  let customerId = input.tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await s.customers.create({
      metadata: { tenantId: input.tenant.id },
      name: input.tenant.name,
    });
    customerId = customer.id;
    await withBypass((tx) =>
      tx.tenant.update({
        where: { id: input.tenant.id },
        data: { stripeCustomerId: customerId },
      }),
    );
  }

  // Trial days remaining (0 if expired or unset).
  const trialDays = input.tenant.trialEndsAt
    ? Math.max(0, Math.ceil((input.tenant.trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : 0;

  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    subscription_data: trialDays > 0 ? { trial_period_days: trialDays } : undefined,
    allow_promotion_codes: true,
    metadata: { tenantId: input.tenant.id },
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }
  return { url: session.url };
}
