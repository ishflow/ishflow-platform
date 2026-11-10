import Stripe from 'stripe';

let cached: Stripe | undefined;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Set it in .env.local (test mode key from Stripe dashboard).',
    );
  }
  cached = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
  return cached;
}

export function resetStripeForTests(client?: Stripe): void {
  cached = client;
}
