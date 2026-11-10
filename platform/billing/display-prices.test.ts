import type { TenantPlan } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { PLAN_DISPLAY_PRICES, type SupportedCurrency, getPlanDisplayPrice } from './display-prices';

const PLANS: TenantPlan[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
const INTERVALS = ['month', 'year'] as const;
const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['USD', 'EUR', 'RUB', 'TRY'];

describe('getPlanDisplayPrice', () => {
  it('returns a non-empty string for every (plan, interval, currency) combination', () => {
    for (const plan of PLANS) {
      for (const interval of INTERVALS) {
        for (const currency of SUPPORTED_CURRENCIES) {
          const price = getPlanDisplayPrice(plan, interval, currency);
          expect(typeof price).toBe('string');
          expect(price.length).toBeGreaterThan(0);
          expect(price).toBe(PLAN_DISPLAY_PRICES[plan][interval][currency]);
        }
      }
    }
  });

  it('returns distinct values for monthly vs yearly on paid plans (USD)', () => {
    const paidPlans: TenantPlan[] = ['starter', 'pro', 'business'];
    for (const plan of paidPlans) {
      const monthly = getPlanDisplayPrice(plan, 'month', 'USD');
      const yearly = getPlanDisplayPrice(plan, 'year', 'USD');
      expect(monthly).not.toBe(yearly);
    }
  });

  it('falls back to USD for unsupported currency codes', () => {
    expect(getPlanDisplayPrice('starter', 'month', 'XYZ')).toBe('$19/mo');
  });
});
