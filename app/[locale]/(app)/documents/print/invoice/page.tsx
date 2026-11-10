import { V2PrintInvoice } from '@/components/v2/documents-extra/print/print-invoice';
import { V2PrintToolbar } from '@/components/v2/documents-extra/print/print-toolbar';

export default async function V2PrintInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const { doc = 'SF-2026-114' } = await searchParams;
  return (
    <div className="content">
      <V2PrintToolbar backHref="/documents/sales-invoice" />
      <V2PrintInvoice docNo={doc} />
    </div>
  );
}
