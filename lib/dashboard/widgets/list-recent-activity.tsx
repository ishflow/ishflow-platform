import { ActivityFeed } from '@/components/app/dashboard/activity-feed';
import { requireContext } from '@/platform/auth/current-context';
import { recentActivity } from '@/platform/engine/dashboard-queries';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function ListRecentActivityWidget() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const items = await recentActivity(ctx as Parameters<typeof recentActivity>[0], 10);
  return (
    <ActivityFeed
      title={t('recentActivity')}
      emptyLabel={t('empty')}
      items={items.map((a) => ({ ...a, href: `/${locale}${a.href}` }))}
    />
  );
}
