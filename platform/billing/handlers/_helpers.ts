import { stripe } from '@/platform/billing/stripe-client';
/**
 * Shared helpers for Stripe event handlers.
 *
 * `mapPriceToPlan` resolves the `TenantPlan` from a Stripe Price's
 * `metadata.plan`. Results are cached process-wide to keep the webhook
 * dispatcher fast under retry storms — Stripe Prices are immutable so the
 * cache never needs invalidation in production.
 */
import type { TenantPlan } from '@prisma/client';

const VALID_PLANS: ReadonlySet<TenantPlan> = new Set([
  'free',
  'starter',
  'pro',
  'business',
  'enterprise',
]);

const PRICE_TO_PLAN_CACHE = new Map<string, TenantPlan>();

export async function mapPriceToPlan(priceId: string): Promise<TenantPlan> {
  const cached = PRICE_TO_PLAN_CACHE.get(priceId);
  if (cached) return cached;
  const price = await stripe().prices.retrieve(priceId);
  const raw = price.metadata?.plan;
  if (!raw || !VALID_PLANS.has(raw as TenantPlan)) {
    throw new Error(
      `Stripe Price ${priceId} is missing metadata.plan or has an invalid value (got "${raw ?? 'undefined'}")`,
    );
  }
  const plan = raw as TenantPlan;
  PRICE_TO_PLAN_CACHE.set(priceId, plan);
  return plan;
}

/**
 * Test-only: clear the price→plan cache so mocked Stripe responses don't
 * leak between test files.
 */
export function resetPriceCacheForTests(): void {
  PRICE_TO_PLAN_CACHE.clear();
}

/**
 * Extract the Stripe customer id from a string-or-object reference. Stripe's
 * SDK types most "customer" fields as `string | Stripe.Customer | Stripe.DeletedCustomer`.
 */
export function extractCustomerId(
  customer: string | { id: string } | null | undefined,
): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  return customer.id;
}
