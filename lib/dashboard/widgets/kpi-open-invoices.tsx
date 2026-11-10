import { KpiCard } from '@/components/app/dashboard/kpi-card';
import { requireContext } from '@/platform/auth/current-context';
import { openInvoiceCount } from '@/platform/engine/dashboard-queries';
import { getTranslations } from 'next-intl/server';

export default async function KpiOpenInvoicesWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  const data = await openInvoiceCount(ctx as Parameters<typeof openInvoiceCount>[0]);
  return (
    <KpiCard
      label={t('kpi.openInvoices')}
      value={String(data.current)}
      delta={data.delta}
      deltaLabel={t('kpi.vs7DaysAgo')}
    />
  );
}
