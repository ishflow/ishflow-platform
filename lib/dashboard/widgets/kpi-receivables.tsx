import { KpiCard } from '@/components/app/dashboard/kpi-card';
import { formatMoney } from '@/lib/format-money';
import { requireContext } from '@/platform/auth/current-context';
import { accountsReceivableTotal } from '@/platform/engine/dashboard-queries';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function KpiReceivablesWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const ar = await accountsReceivableTotal(ctx as Parameters<typeof accountsReceivableTotal>[0]);
  return (
    <KpiCard
      label={t('kpi.receivables')}
      value={formatMoney(ar.current, locale, ctx.tenant.currency)}
      delta={ar.delta}
      deltaLabel={t('kpi.vs30DaysAgo')}
    />
  );
}
