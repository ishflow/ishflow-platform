import { V2RevenueChart } from '@/components/v2/dashboard/revenue-chart';
import type { RevenueChartPayload } from '@/configs/dashboard/widgets/revenue-chart';
import { formatMoney } from '@/lib/format-money';
import { getTranslations } from 'next-intl/server';

export async function RevenueChartRenderer({
  payload,
  locale,
  currency,
}: {
  payload: RevenueChartPayload | null;
  locale: string;
  currency: string;
}) {
  const t = await getTranslations('v2_dashboard.chart');
  const safe: RevenueChartPayload = payload ?? {
    currency,
    points: [],
    labels: [],
    totalRevenue: 0,
    changePct: 0,
  };
  return (
    <V2RevenueChart
      title={t('revenueTitle')}
      totalLabel={formatMoney(safe.totalRevenue, locale, safe.currency)}
      changePct={safe.changePct}
      periodLabel={t('periodLast30Days')}
      points={safe.points}
      labels={safe.labels}
    />
  );
}
