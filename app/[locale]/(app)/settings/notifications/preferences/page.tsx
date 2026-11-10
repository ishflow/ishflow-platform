import {
  type NotificationPrefsLabels,
  V2NotificationPreferences,
} from '@/components/v2/settings/notification-preferences';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { getNotificationSettings } from '@/platform/notifications/settings';
import { getTranslations } from 'next-intl/server';

export default async function V2NotificationPreferencesPage() {
  const t = await getTranslations('v2_settings.notifications.preferences');
  const ctx = await requireTenantContext();
  const settings = await getNotificationSettings(ctx.tenant.id);

  const labels: NotificationPrefsLabels = {
    email: t('email'),
    thresholds: t('thresholds'),
    scope: t('scope'),
    save: t('save'),
    saving: t('saving'),
    saved: t('saved'),
    errorPrefix: t('errorPrefix'),
    invoiceSent: { name: t('items.invoiceSent.name'), desc: t('items.invoiceSent.desc') },
    paymentReceived: {
      name: t('items.paymentReceived.name'),
      desc: t('items.paymentReceived.desc'),
    },
    lowStockAlert: { name: t('items.lowStockAlert.name'), desc: t('items.lowStockAlert.desc') },
    overduePayment: { name: t('items.overduePayment.name'), desc: t('items.overduePayment.desc') },
    lowStockThreshold: {
      name: t('items.lowStockThreshold.name'),
      desc: t('items.lowStockThreshold.desc'),
    },
    overdueDaysThreshold: {
      name: t('items.overdueDaysThreshold.name'),
      desc: t('items.overdueDaysThreshold.desc'),
    },
  };

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2NotificationPreferences settings={settings} labels={labels} />
      </div>
    </>
  );
}
