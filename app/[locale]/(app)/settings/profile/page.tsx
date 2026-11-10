import { V2Profile } from '@/components/v2/settings/profile';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2ProfilePage() {
  const t = await getTranslations('v2_settings.profile');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2Profile />
      </div>
    </>
  );
}
