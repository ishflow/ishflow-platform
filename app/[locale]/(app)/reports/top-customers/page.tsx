import '@/configs';
import { renderV2ReportView } from '@/components/v2/reports/render-report-view';

export default async function V2TopCustomersReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderV2ReportView({ id: 'top-customers', searchParams: await searchParams });
}
