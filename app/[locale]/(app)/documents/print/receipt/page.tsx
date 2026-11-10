import { V2PrintReceipt } from '@/components/v2/documents-extra/print/print-receipt';
import { V2PrintToolbar } from '@/components/v2/documents-extra/print/print-toolbar';

export default async function V2PrintReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const { doc = 'PAY-IN-000007' } = await searchParams;
  return (
    <div className="content">
      <V2PrintToolbar backHref="/documents/payment-received" />
      <V2PrintReceipt docNo={doc} />
    </div>
  );
}
