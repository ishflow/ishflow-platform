import { KpiCard } from '@/components/app/dashboard/kpi-card';
import { formatMoney } from '@/lib/format-money';
import { requireContext } from '@/platform/auth/current-context';
import { accountsPayableTotal } from '@/platform/engine/dashboard-queries';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function KpiPayablesWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const ap = await accountsPayableTotal(ctx as Parameters<typeof accountsPayableTotal>[0]);
  return (
    <KpiCard
      label={t('kpi.payables')}
      value={formatMoney(ap.current, locale, ctx.tenant.currency)}
      delta={ap.delta}
      deltaLabel={t('kpi.vs30DaysAgo')}
    />
  );
}
