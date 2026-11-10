import { DocumentAttachmentsCard } from '@/components/v2/documents/aside';
import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2StockAdjustmentNewPage() {
  return renderV2DocumentNew({
    slug: 'stock-adjustment',
    asideCards: <DocumentAttachmentsCard />,
  });
}
