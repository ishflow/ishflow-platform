/**
 * Idempotently creates the ishflow Product and all paid-tier Stripe Prices
 * in Stripe test mode. Run once per environment; safe to re-run.
 *
 * Usage:  pnpm tsx scripts/seed-stripe-prices.ts
 * Env:    STRIPE_SECRET_KEY (test mode sk_test_...)
 */
import { stripe } from '../platform/billing/stripe-client';
import { PRICE_AMOUNTS } from '../platform/billing/stripe-prices';

const PRODUCT_NAME = 'ishflow';
const PRODUCT_LOOKUP_KEY = '1canalog';

async function ensureProduct(): Promise<string> {
  const s = stripe();
  const existing = await s.products.search({
    query: `metadata['lookup_key']:'${PRODUCT_LOOKUP_KEY}'`,
  });
  const found = existing.data[0];
  if (found) {
    return found.id;
  }
  const created = await s.products.create({
    name: PRODUCT_NAME,
    metadata: { lookup_key: PRODUCT_LOOKUP_KEY },
  });
  return created.id;
}

async function ensurePrice(opts: {
  productId: string;
  plan: string;
  interval: 'month' | 'year';
  currency: string;
  amount: number;
}): Promise<string> {
  const s = stripe();
  const lookupKey = `${opts.plan}_${opts.interval}_${opts.currency.toLowerCase()}`;
  const existing = await s.prices.search({ query: `lookup_key:'${lookupKey}'` });
  const found = existing.data[0];
  if (found) {
    return found.id;
  }
  const created = await s.prices.create({
    product: opts.productId,
    unit_amount: opts.amount,
    currency: opts.currency.toLowerCase(),
    recurring: { interval: opts.interval },
    lookup_key: lookupKey,
    metadata: { plan: opts.plan, interval: opts.interval, currency: opts.currency },
  });
  return created.id;
}

async function main(): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not set. Source .env.local first.');
  }
  const productId = await ensureProduct();
  process.stdout.write(`product: ${productId}\n\n`);
  process.stdout.write('STRIPE_PRICES paste-ready map:\n');
  process.stdout.write('{\n');
  for (const [plan, intervals] of Object.entries(PRICE_AMOUNTS)) {
    process.stdout.write(`  ${plan}: {\n`);
    for (const [interval, currencies] of Object.entries(intervals)) {
      process.stdout.write(`    ${interval}: {\n`);
      for (const [currency, amount] of Object.entries(currencies)) {
        const id = await ensurePrice({
          productId,
          plan,
          interval: interval as 'month' | 'year',
          currency,
          amount,
        });
        process.stdout.write(`      ${currency}: '${id}',\n`);
      }
      process.stdout.write('    },\n');
    }
    process.stdout.write('  },\n');
  }
  process.stdout.write('}\n');
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
