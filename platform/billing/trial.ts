import type { Tenant, TenantPlan } from '@prisma/client';

export function isInActiveTrial(tenant: Pick<Tenant, 'status' | 'trialEndsAt'>): boolean {
  return (
    tenant.status === 'trialing' && tenant.trialEndsAt !== null && tenant.trialEndsAt > new Date()
  );
}

export function effectivePlan(tenant: Pick<Tenant, 'plan' | 'status' | 'trialEndsAt'>): TenantPlan {
  return isInActiveTrial(tenant) ? 'pro' : tenant.plan;
}

/**
 * True when a trial has lapsed and the tenant is still flagged `trialing`.
 * Callers use this to lazily flip `status` → `active` on context resolve;
 * `effectivePlan` already drops features to the stored plan at expiry, so
 * this flip only cleans the displayed status (no entitlement change).
 */
export function trialShouldExpire(tenant: Pick<Tenant, 'status' | 'trialEndsAt'>): boolean {
  return (
    tenant.status === 'trialing' && tenant.trialEndsAt !== null && tenant.trialEndsAt <= new Date()
  );
}
