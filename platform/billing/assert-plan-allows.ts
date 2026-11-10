import { PlanLimitError, type PlanLimitKind } from '@/platform/engine/errors';
/**
 * `assertPlanAllows(tenant, action)` — the single entry point every write
 * path calls before performing an action that could push a tenant past
 * its plan ceiling. Throws `PlanLimitError` (serializable to 402) when
 * the projected usage would exceed the effective limit, or when a
 * feature is gated behind a higher plan.
 *
 * Counts are computed via `getUsage`; ceilings via `effectiveLimits`
 * (PLAN_LIMITS + unexpired overrides).
 */
import type { Tenant, TenantPlan } from '@prisma/client';
import { effectiveLimits } from './effective-limits';
import { PLAN_FEATURES, type PlanFeatures } from './plans';
import { effectivePlan } from './trial';
import { getUsage } from './usage';

export type PlanAction =
  | { kind: 'add_member' }
  | { kind: 'post_document' }
  | { kind: 'upload_attachment'; addBytes: number }
  | { kind: 'create_saved_view' }
  | { kind: 'feature'; feature: keyof PlanFeatures };

const FEATURE_TO_LIMIT_KIND: Record<keyof PlanFeatures, PlanLimitKind> = {
  advancedReports: 'advanced_reports',
  periodClose: 'period_close',
  apiAccess: 'api_access',
  customBranding: 'custom_branding',
  sso: 'sso',
};

const UPGRADE_FOR_KIND: Record<PlanLimitKind, TenantPlan | null> = {
  members: 'starter',
  monthly_posted_docs: 'starter',
  storage_bytes: 'starter',
  saved_views: 'starter',
  advanced_reports: 'pro',
  period_close: 'pro',
  api_access: 'business',
  custom_branding: 'business',
  sso: 'enterprise',
};

export async function assertPlanAllows(
  tenant: Pick<Tenant, 'id' | 'plan' | 'status' | 'trialEndsAt'>,
  action: PlanAction,
): Promise<void> {
  if (action.kind === 'feature') {
    const allowed = PLAN_FEATURES[effectivePlan(tenant)][action.feature];
    if (!allowed) {
      const kind = FEATURE_TO_LIMIT_KIND[action.feature];
      throw new PlanLimitError(kind, 0, 0, UPGRADE_FOR_KIND[kind]);
    }
    return;
  }

  const [limits, usage] = await Promise.all([effectiveLimits(tenant), getUsage(tenant.id)]);

  let kind: PlanLimitKind;
  let current: number;
  let projected: number;
  let allowed: number;
  switch (action.kind) {
    case 'add_member':
      kind = 'members';
      current = usage.members;
      projected = usage.members + 1;
      allowed = limits.members;
      break;
    case 'post_document':
      kind = 'monthly_posted_docs';
      current = usage.monthlyPostedDocs;
      projected = usage.monthlyPostedDocs + 1;
      allowed = limits.monthlyPostedDocs;
      break;
    case 'upload_attachment':
      kind = 'storage_bytes';
      current = usage.storageBytes;
      projected = usage.storageBytes + action.addBytes;
      allowed = limits.storageBytes;
      break;
    case 'create_saved_view':
      kind = 'saved_views';
      current = usage.savedViews;
      projected = usage.savedViews + 1;
      allowed = limits.savedViews;
      break;
  }

  if (projected > allowed) {
    throw new PlanLimitError(kind, current, allowed, UPGRADE_FOR_KIND[kind]);
  }
}
