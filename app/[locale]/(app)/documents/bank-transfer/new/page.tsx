import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2BankTransferNewPage() {
  return renderV2DocumentNew({ slug: 'bank-transfer' });
}
