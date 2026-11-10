import { DocumentAttachmentsCard } from '@/components/v2/documents/aside';
import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2StockTransferNewPage() {
  return renderV2DocumentNew({
    slug: 'stock-transfer',
    asideCards: <DocumentAttachmentsCard />,
  });
}
