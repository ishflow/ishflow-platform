import { KpiCard } from '@/components/app/dashboard/kpi-card';
import { formatMoney } from '@/lib/format-money';
import { requireContext } from '@/platform/auth/current-context';
import { thisMonthSalesTotal } from '@/platform/engine/dashboard-queries';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function KpiThisMonthSalesWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const data = await thisMonthSalesTotal(ctx as Parameters<typeof thisMonthSalesTotal>[0]);
  return (
    <KpiCard
      label={t('kpi.thisMonthSales')}
      value={formatMoney(data.current, locale, ctx.tenant.currency)}
      delta={data.delta}
      deltaLabel={t('kpi.vsLastMonth')}
    />
  );
}
