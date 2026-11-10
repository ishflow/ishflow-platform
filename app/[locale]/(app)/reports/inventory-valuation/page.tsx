import '@/configs';
import { PlanFeatureGate } from '@/components/billing/plan-feature-gate';
import { renderV2ReportView } from '@/components/v2/reports/render-report-view';

export default async function V2InventoryValuationReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PlanFeatureGate feature="advancedReports">
      {await renderV2ReportView({ id: 'inventory-valuation', searchParams: await searchParams })}
    </PlanFeatureGate>
  );
}
