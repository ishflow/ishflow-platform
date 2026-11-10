import { withBypass } from '@/platform/db/tenant-context';
import type { TenantPlan } from '@prisma/client';

/**
 * Single billing currency: USD. Super-admin revenue is reported in USD only —
 * a tenant's operational `currency` is never converted into MRR. MRR for a
 * tenant is simply this plan's USD monthly price when the tenant is a paying
 * (active) subscriber, and 0 otherwise.
 */
const PLAN_USD_PER_MONTH: Record<TenantPlan, number> = {
  free: 0,
  starter: 19,
  pro: 49,
  business: 149,
  enterprise: 499,
};

export interface RevenueSnapshot {
  mrrByPlan: Record<TenantPlan, number>;
  planDistribution: Record<TenantPlan, number>;
  churn30d: number;
  /** Fraction of trials that ended in the last 30d and are now active. Range 0..1. */
  trialConversion30d: number;
  totalMrrUsd: number;
}

/**
 * Aggregates platform-wide revenue metrics. Bypasses RLS — `withBypass` is
 * appropriate here because the super-admin console needs cross-tenant
 * visibility and this code path is already gated by `assertSuperAdmin` in
 * the route layout.
 */
export async function getRevenueSnapshot(): Promise<RevenueSnapshot> {
  return withBypass(async (tx) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tenants = await tx.tenant.findMany({
      where: { deletedAt: null },
      select: {
        plan: true,
        status: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });

    const mrrByPlan: Record<TenantPlan, number> = {
      free: 0,
      starter: 0,
      pro: 0,
      business: 0,
      enterprise: 0,
    };
    const planDistribution: Record<TenantPlan, number> = {
      free: 0,
      starter: 0,
      pro: 0,
      business: 0,
      enterprise: 0,
    };

    for (const t of tenants) {
      planDistribution[t.plan]++;
      if (t.status === 'active') {
        mrrByPlan[t.plan] += PLAN_USD_PER_MONTH[t.plan];
      }
    }

    const churn30d = await tx.tenant.count({
      where: { status: 'cancelled', updatedAt: { gte: since } },
    });

    const trialEnded = await tx.tenant.findMany({
      where: { trialEndsAt: { gte: since, lte: new Date() } },
      select: { status: true },
    });
    const trialConversion30d = computeTrialConversion(trialEnded);

    const totalMrrUsd = Object.values(mrrByPlan).reduce((s, n) => s + n, 0);
    return {
      mrrByPlan,
      planDistribution,
      churn30d,
      trialConversion30d,
      totalMrrUsd,
    };
  });
}

/** Pure helper exported for unit testing. */
export function computeTrialConversion(trialEnded: Array<{ status: string }>): number {
  if (trialEnded.length === 0) return 0;
  return trialEnded.filter((t) => t.status === 'active').length / trialEnded.length;
}
