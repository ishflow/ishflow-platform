import { DocumentAttachmentsCard } from '@/components/v2/documents/aside';
import { renderV2DocumentNew } from '@/components/v2/documents/generic-document-page';
import { buildPaymentPrefill } from '@/components/v2/documents/payment-prefill';

export default async function V2PaymentSentNewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const prefill = await buildPaymentPrefill({ searchParams: sp, party: 'supplier' });
  return renderV2DocumentNew({
    slug: 'payment-sent',
    asideCards: <DocumentAttachmentsCard />,
    prefill,
  });
}
