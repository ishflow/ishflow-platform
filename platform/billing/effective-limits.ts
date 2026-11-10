import { withBypass } from '@/platform/db/tenant-context';
/**
 * Resolves a tenant's effective plan limits by overlaying any
 * unexpired `PlanLimitOverride` rows on top of the static `PLAN_LIMITS`
 * matrix. Used by `assertPlanAllows` and by the billing UI to render
 * "X / Y used" gauges.
 */
import type { Tenant } from '@prisma/client';
import { PLAN_LIMITS, type PlanLimits } from './plans';
import { effectivePlan } from './trial';

const KEY_TO_FIELD = {
  members: 'members',
  monthlyPostedDocs: 'monthlyPostedDocs',
  storageBytes: 'storageBytes',
  savedViews: 'savedViews',
} as const satisfies Record<string, keyof PlanLimits>;

export async function effectiveLimits(
  tenant: Pick<Tenant, 'id' | 'plan' | 'status' | 'trialEndsAt'>,
): Promise<PlanLimits> {
  const base = { ...PLAN_LIMITS[effectivePlan(tenant)] };
  const overrides = await withBypass((tx) =>
    tx.planLimitOverride.findMany({
      where: {
        tenantId: tenant.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
  );
  for (const o of overrides) {
    const field = KEY_TO_FIELD[o.key as keyof typeof KEY_TO_FIELD];
    if (field) {
      base[field] = o.value;
    }
  }
  return base;
}
