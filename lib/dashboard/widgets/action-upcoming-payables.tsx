import { DueList } from '@/components/app/dashboard/due-list';
import { requireContext } from '@/platform/auth/current-context';
import { upcomingPayables } from '@/platform/engine/dashboard-queries';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function ActionUpcomingPayablesWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const items = await upcomingPayables(ctx as Parameters<typeof upcomingPayables>[0], 5);
  return (
    <DueList
      title={t('upcomingPayables')}
      emptyLabel={t('empty')}
      items={items.map((d) => ({
        ...d,
        href: `/${locale}/catalogs/purchases.supplier/${d.id}`,
      }))}
      locale={locale}
      currency={ctx.tenant.currency}
    />
  );
}
