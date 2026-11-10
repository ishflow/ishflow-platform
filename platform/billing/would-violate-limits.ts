import type { Tenant, TenantPlan } from '@prisma/client';
import { PLAN_LIMITS } from './plans';
import { getUsage } from './usage';

export interface LimitViolation {
  kind: 'members' | 'monthly_posted_docs' | 'storage_bytes' | 'saved_views';
  current: number;
  newLimit: number;
}

/**
 * Returns the list of limits the tenant currently exceeds for the proposed plan.
 * Empty array = downgrade is safe.
 */
export async function wouldViolateLimits(
  tenant: Pick<Tenant, 'id' | 'plan'>,
  newPlan: TenantPlan,
): Promise<LimitViolation[]> {
  const usage = await getUsage(tenant.id);
  const newLimits = PLAN_LIMITS[newPlan];
  const violations: LimitViolation[] = [];

  if (usage.members > newLimits.members) {
    violations.push({ kind: 'members', current: usage.members, newLimit: newLimits.members });
  }
  if (usage.monthlyPostedDocs > newLimits.monthlyPostedDocs) {
    violations.push({
      kind: 'monthly_posted_docs',
      current: usage.monthlyPostedDocs,
      newLimit: newLimits.monthlyPostedDocs,
    });
  }
  if (usage.storageBytes > newLimits.storageBytes) {
    violations.push({
      kind: 'storage_bytes',
      current: usage.storageBytes,
      newLimit: newLimits.storageBytes,
    });
  }
  if (usage.savedViews > newLimits.savedViews) {
    violations.push({
      kind: 'saved_views',
      current: usage.savedViews,
      newLimit: newLimits.savedViews,
    });
  }
  return violations;
}
