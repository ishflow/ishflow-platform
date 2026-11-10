import '@/configs';
import { renderV2ReportView } from '@/components/v2/reports/render-report-view';

export default async function V2ProductCardReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderV2ReportView({ id: 'product-card', searchParams: await searchParams });
}
