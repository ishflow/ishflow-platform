import { DocumentAttachmentsCard } from '@/components/v2/documents/aside';
import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2InventoryCountNewPage() {
  return renderV2DocumentNew({
    slug: 'inventory-count',
    asideCards: <DocumentAttachmentsCard />,
  });
}
