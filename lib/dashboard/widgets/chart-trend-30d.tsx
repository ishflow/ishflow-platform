import { TrendChart } from '@/components/app/dashboard/trend-chart';
import { requireContext } from '@/platform/auth/current-context';
import { last30DaysTrend } from '@/platform/engine/dashboard-queries';
import { getTranslations } from 'next-intl/server';

export default async function ChartTrend30dWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  const data = await last30DaysTrend(ctx as Parameters<typeof last30DaysTrend>[0]);
  return (
    <TrendChart
      data={data}
      salesLabel={t('trend.sales')}
      collectionsLabel={t('trend.collections')}
    />
  );
}
