import { V2AddonsList } from '@/components/v2/settings/addons/list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2AddonsPage() {
  const t = await getTranslations('v2_addons.page');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2AddonsList />
      </div>
    </>
  );
}
