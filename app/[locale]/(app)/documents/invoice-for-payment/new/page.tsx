import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2InvoiceForPaymentNewPage() {
  return renderV2DocumentNew({ slug: 'invoice-for-payment' });
}
