import { DocumentAttachmentsCard, PurchaseInvoiceTipsCard } from '@/components/v2/documents/aside';
import { renderV2DocumentDetail } from '@/components/v2/documents/generic-document-page';

export const dynamic = 'force-dynamic';

export default async function V2PurchaseInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return renderV2DocumentDetail({
    slug: 'purchase-invoice',
    id,
    asideCards: (
      <>
        <DocumentAttachmentsCard />
        <div className="spacer" />
        <PurchaseInvoiceTipsCard />
      </>
    ),
  });
}
