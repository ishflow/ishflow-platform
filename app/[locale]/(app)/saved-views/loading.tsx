import { V2RegisterSkeleton } from '@/components/v2/data/register-skeleton';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2SavedViewsLoading() {
  const t = await getTranslations('v2_data.loading');
  return (
    <>
      <V2Topbar
        breadcrumb={t('savedViews.breadcrumb')}
        title={t('savedViews.title')}
        subtitle={t('savedViews.subtitle')}
      />
      <V2RegisterSkeleton />
    </>
  );
}
