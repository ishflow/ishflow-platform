import { DocumentAttachmentsCard, SalesInvoiceTipsCard } from '@/components/v2/documents/aside';
import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2SalesInvoiceNewPage() {
  return renderV2DocumentNew({
    slug: 'sales-invoice',
    asideCards: (
      <>
        <DocumentAttachmentsCard />
        <div className="spacer" />
        <SalesInvoiceTipsCard />
      </>
    ),
  });
}
