import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireContext } from '@/platform/auth/current-context';
import { lowStockCount } from '@/platform/engine/dashboard-queries';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function ActionLowStockWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const data = await lowStockCount(ctx as Parameters<typeof lowStockCount>[0]);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{t('lowStockTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.count === 0 ? (
          <div className="text-sm text-muted-foreground">{t('lowStockOk')}</div>
        ) : (
          <Link
            href={`/${locale}/reports/inventory.stock-analysis`}
            className="text-sm font-medium text-rose-600 hover:underline dark:text-rose-400"
          >
            {t('lowStockAlert', { count: data.count })}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
