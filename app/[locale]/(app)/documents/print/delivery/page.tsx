import { V2PrintDelivery } from '@/components/v2/documents-extra/print/print-delivery';
import { V2PrintToolbar } from '@/components/v2/documents-extra/print/print-toolbar';

export default async function V2PrintDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const { doc = 'DLV-0013' } = await searchParams;
  return (
    <div className="content">
      <V2PrintToolbar backHref="/documents/sales-invoice" />
      <V2PrintDelivery docNo={doc} />
    </div>
  );
}
