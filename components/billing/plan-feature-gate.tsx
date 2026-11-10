import { UpsellCard } from '@/components/billing/upsell-card';
import { resolveContext } from '@/platform/auth/current-context';
import { type FeatureFlag, hasFeature, minimumPlanFor } from '@/platform/billing/features';
import type { ReactNode } from 'react';

/**
 * Server gate for plan-locked features. Renders `children` when the tenant's
 * effective plan includes `feature`; otherwise renders the shared `UpsellCard`.
 *
 * A tenant-less context (unauthenticated / no tenant selected) falls through to
 * `children` — this is a *plan* check, not an auth check; the route's own auth
 * layer is responsible for unauthenticated access.
 */
export async function PlanFeatureGate({
  feature,
  children,
}: {
  feature: FeatureFlag;
  children: ReactNode;
}) {
  const ctx = await resolveContext();
  if (ctx?.tenant && !hasFeature(ctx.tenant, feature)) {
    return <UpsellCard feature={feature} upgradeTo={minimumPlanFor(feature)} />;
  }
  return <>{children}</>;
}
