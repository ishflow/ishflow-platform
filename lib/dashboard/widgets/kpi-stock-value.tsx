import { KpiCard } from '@/components/app/dashboard/kpi-card';
import { requireContext } from '@/platform/auth/current-context';
import { lowStockCount } from '@/platform/engine/dashboard-queries';
import { getTranslations } from 'next-intl/server';

export default async function KpiStockValueWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  // MVP: show count only; value computation is Phase 2
  const data = await lowStockCount(ctx as Parameters<typeof lowStockCount>[0]);
  return (
    <KpiCard
      label={t('kpi.stockValue')}
      value={String(data.count)}
      delta={undefined}
      deltaLabel={undefined}
    />
  );
}
