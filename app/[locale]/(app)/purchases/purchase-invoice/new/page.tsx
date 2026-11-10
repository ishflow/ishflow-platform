import { DocumentAttachmentsCard, PurchaseInvoiceTipsCard } from '@/components/v2/documents/aside';
import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2PurchaseInvoiceNewPage() {
  return renderV2DocumentNew({
    slug: 'purchase-invoice',
    asideCards: (
      <>
        <DocumentAttachmentsCard />
        <div className="spacer" />
        <PurchaseInvoiceTipsCard />
      </>
    ),
  });
}
