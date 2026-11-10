import {
  type NotificationsInboxLabels,
  V2NotificationsInbox,
} from '@/components/v2/settings/notifications';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2NotificationsInboxPage() {
  const t = await getTranslations('v2_settings.notifications');
  const labels: NotificationsInboxLabels = {
    emptyTitle: t('list.emptyTitle'),
    emptyNote: t('list.emptyNote'),
    preferences: t('list.preferences'),
  };
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2NotificationsInbox labels={labels} />
      </div>
    </>
  );
}
