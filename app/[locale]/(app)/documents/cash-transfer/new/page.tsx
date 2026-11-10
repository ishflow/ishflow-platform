import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2CashTransferNewPage() {
  return renderV2DocumentNew({ slug: 'cash-transfer' });
}
