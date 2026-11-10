import { DueList } from '@/components/app/dashboard/due-list';
import { requireContext } from '@/platform/auth/current-context';
import { upcomingReceivables } from '@/platform/engine/dashboard-queries';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function ActionUpcomingReceivablesWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const items = await upcomingReceivables(ctx as Parameters<typeof upcomingReceivables>[0], 5);
  return (
    <DueList
      title={t('upcomingReceivables')}
      emptyLabel={t('empty')}
      items={items.map((d) => ({
        ...d,
        href: `/${locale}/catalogs/sales.customer/${d.id}`,
      }))}
      locale={locale}
      currency={ctx.tenant.currency}
    />
  );
}
