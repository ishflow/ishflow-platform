import { V2NumberSeriesPage } from '@/components/v2/documents-extra/number-series/page';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2NumberSeriesRoute() {
  const t = await getTranslations('v2_documents_extra.numberSeries');

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2NumberSeriesPage />
      </div>
    </>
  );
}
