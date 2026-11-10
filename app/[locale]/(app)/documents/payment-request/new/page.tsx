import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';

export default async function V2PaymentRequestNewPage() {
  return renderV2DocumentNew({ slug: 'payment-request' });
}
