import { V2ReportSkeleton } from '@/components/v2/data/report-skeleton';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2ReportsLoading() {
  const t = await getTranslations('v2_data.loading');
  return (
    <>
      <V2Topbar
        breadcrumb={t('report.breadcrumb')}
        title={t('report.title')}
        subtitle={t('report.subtitle')}
      />
      <V2ReportSkeleton />
    </>
  );
}
