import { V2DangerZone } from '@/components/v2/settings/danger-zone';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2DangerPage() {
  const t = await getTranslations('v2_settings.danger');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2DangerZone />
      </div>
    </>
  );
}
