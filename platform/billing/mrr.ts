import type { Tenant, TenantPlan } from '@prisma/client';

// Monthly USD price per plan. Source: platform/billing/stripe-prices.ts.
// Single billing currency (USD) — update as Stripe prices evolve; not on the hot path.
export const PLAN_PRICES_USD: Record<TenantPlan, number> = {
  free: 0,
  starter: 19,
  pro: 49,
  business: 149,
  enterprise: 499,
};

export function monthlyUsd(plan: TenantPlan): number {
  return PLAN_PRICES_USD[plan] ?? 0;
}

export function computeMrr(tenants: Pick<Tenant, 'plan' | 'status'>[]): number {
  return tenants
    .filter((t) => t.status === 'active')
    .reduce((sum, t) => sum + monthlyUsd(t.plan), 0);
}
