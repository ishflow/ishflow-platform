import type { TenantPlan } from '@prisma/client';

export type BillingInterval = 'month' | 'year';
export type BillingCurrency = 'USD' | 'EUR' | 'RUB' | 'TRY';

type PaidPlan = Exclude<TenantPlan, 'free' | 'enterprise'>;

/**
 * Stripe Price IDs keyed by [plan][interval][currency].
 * Populated by running `pnpm tsx scripts/seed-stripe-prices.ts`
 * against a Stripe test-mode account and pasting the printed IDs here.
 */
export const STRIPE_PRICES: Record<
  PaidPlan,
  Record<BillingInterval, Record<BillingCurrency, string>>
> = {
  starter: {
    month: {
      USD: 'price_REPLACE_ME_starter_month_usd',
      EUR: 'price_REPLACE_ME_starter_month_eur',
      RUB: 'price_REPLACE_ME_starter_month_rub',
      TRY: 'price_REPLACE_ME_starter_month_try',
    },
    year: {
      USD: 'price_REPLACE_ME_starter_year_usd',
      EUR: 'price_REPLACE_ME_starter_year_eur',
      RUB: 'price_REPLACE_ME_starter_year_rub',
      TRY: 'price_REPLACE_ME_starter_year_try',
    },
  },
  pro: {
    month: {
      USD: 'price_REPLACE_ME_pro_month_usd',
      EUR: 'price_REPLACE_ME_pro_month_eur',
      RUB: 'price_REPLACE_ME_pro_month_rub',
      TRY: 'price_REPLACE_ME_pro_month_try',
    },
    year: {
      USD: 'price_REPLACE_ME_pro_year_usd',
      EUR: 'price_REPLACE_ME_pro_year_eur',
      RUB: 'price_REPLACE_ME_pro_year_rub',
      TRY: 'price_REPLACE_ME_pro_year_try',
    },
  },
  business: {
    month: {
      USD: 'price_REPLACE_ME_business_month_usd',
      EUR: 'price_REPLACE_ME_business_month_eur',
      RUB: 'price_REPLACE_ME_business_month_rub',
      TRY: 'price_REPLACE_ME_business_month_try',
    },
    year: {
      USD: 'price_REPLACE_ME_business_year_usd',
      EUR: 'price_REPLACE_ME_business_year_eur',
      RUB: 'price_REPLACE_ME_business_year_rub',
      TRY: 'price_REPLACE_ME_business_year_try',
    },
  },
};

/**
 * Amount-in-minor-unit map used by the seeder to create Prices.
 * USD/EUR/TRY/RUB all use 2-decimal minor unit (cents/kopecks/kuruş).
 * Yearly = monthly * 10 (≈17% off — 2 months free).
 */
export const PRICE_AMOUNTS: Record<
  PaidPlan,
  Record<BillingInterval, Record<BillingCurrency, number>>
> = {
  starter: {
    month: { USD: 1900, EUR: 1700, RUB: 170000, TRY: 65000 },
    year: { USD: 19000, EUR: 17000, RUB: 1700000, TRY: 650000 },
  },
  pro: {
    month: { USD: 4900, EUR: 4500, RUB: 440000, TRY: 170000 },
    year: { USD: 49000, EUR: 45000, RUB: 4400000, TRY: 1700000 },
  },
  business: {
    month: { USD: 9900, EUR: 9100, RUB: 890000, TRY: 340000 },
    year: { USD: 99000, EUR: 91000, RUB: 8900000, TRY: 3400000 },
  },
};
