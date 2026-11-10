import { V2Preferences } from '@/components/v2/settings/preferences';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2PreferencesPage() {
  const t = await getTranslations('v2_settings.preferences');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2Preferences />
      </div>
    </>
  );
}
