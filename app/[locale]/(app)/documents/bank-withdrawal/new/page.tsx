import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2BankWithdrawalNewPage() {
  return renderV2DocumentNew({ slug: 'bank-withdrawal' });
}
