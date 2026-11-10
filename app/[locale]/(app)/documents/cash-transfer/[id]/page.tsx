import { renderV2DocumentDetail } from '@/components/v2/documents/generic-document-page';

export const dynamic = 'force-dynamic';

export default async function V2CashTransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return renderV2DocumentDetail({ slug: 'cash-transfer', id });
}
