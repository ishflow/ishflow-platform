import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireContext } from '@/platform/auth/current-context';
import { getTranslations } from 'next-intl/server';

export default async function ChartStockTrendWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{t('chart.stockTrend')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">{t('comingSoon')}</div>
      </CardContent>
    </Card>
  );
}
