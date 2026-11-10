import type { Tenant, TenantPlan } from '@prisma/client';
import { PLAN_FEATURES, PLAN_RANK, type PlanFeatures } from './plans';
import { effectivePlan } from './trial';

export type FeatureFlag = keyof PlanFeatures;

export function hasFeature(
  tenant: Pick<Tenant, 'plan' | 'status' | 'trialEndsAt'>,
  flag: FeatureFlag,
): boolean {
  return PLAN_FEATURES[effectivePlan(tenant)][flag];
}

export function minimumPlanFor(flag: FeatureFlag): TenantPlan {
  const candidates = (Object.keys(PLAN_FEATURES) as TenantPlan[]).filter(
    (p) => PLAN_FEATURES[p][flag],
  );
  if (candidates.length === 0) return 'enterprise';
  const sorted = candidates.sort((a, b) => PLAN_RANK[a] - PLAN_RANK[b]);
  return sorted[0] ?? 'enterprise';
}

export class PlanFeatureError extends Error {
  constructor(
    public readonly flag: FeatureFlag,
    public readonly upgradeTo: TenantPlan,
  ) {
    super(`feature_locked:${flag}`);
    this.name = 'PlanFeatureError';
  }
  toJSON() {
    return { error: 'feature_locked', flag: this.flag, upgradeTo: this.upgradeTo };
  }
}

export function assertFeature(
  tenant: Pick<Tenant, 'plan' | 'status' | 'trialEndsAt'>,
  flag: FeatureFlag,
): void {
  if (!hasFeature(tenant, flag)) {
    throw new PlanFeatureError(flag, minimumPlanFor(flag));
  }
}
