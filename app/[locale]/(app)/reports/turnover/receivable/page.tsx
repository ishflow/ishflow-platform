import '@/configs';
import { renderV2ReportView } from '@/components/v2/reports/render-report-view';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderV2ReportView({ id: 'turnover-receivable', searchParams: await searchParams });
}
