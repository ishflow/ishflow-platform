import { DocumentAttachmentsCard } from '@/components/v2/documents/aside';
import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2ReturnPurchaseNewPage() {
  return renderV2DocumentNew({
    slug: 'return-purchase',
    asideCards: <DocumentAttachmentsCard />,
  });
}
