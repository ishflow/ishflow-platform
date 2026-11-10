import { V2RevenueChart } from '@/components/v2/dashboard/revenue-chart';
import type { ReportChartSection } from '@/platform/metadata';

/**
 * Render a `chart` section — wraps `V2RevenueChart`. The DSL doesn't carry
 * a `title` or `periodLabel`; the renderer passes them in via props from
 * the surrounding shell (typically `t('chart.title')` / period text).
 */
export function SectionChart({
  section,
  title,
  periodLabel,
}: {
  section: ReportChartSection;
  title: string;
  periodLabel: string;
}) {
  return (
    <V2RevenueChart
      title={title}
      totalLabel={section.totalLabel}
      changePct={section.changePct}
      periodLabel={periodLabel}
      points={section.points}
      labels={section.labels}
    />
  );
}
