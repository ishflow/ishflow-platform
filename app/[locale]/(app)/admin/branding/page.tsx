import { PlanFeatureGate } from '@/components/billing/plan-feature-gate';
import { renderV2Settings } from '@/components/v2/settings/render-settings';

export default async function V2BrandingPage() {
  return (
    <PlanFeatureGate feature="customBranding">
      {await renderV2Settings({ slug: 'admin.branding' })}
    </PlanFeatureGate>
  );
}
