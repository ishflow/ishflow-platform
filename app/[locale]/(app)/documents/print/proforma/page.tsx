import { V2PrintProforma } from '@/components/v2/documents-extra/print/print-proforma';
import { V2PrintToolbar } from '@/components/v2/documents-extra/print/print-toolbar';

export default async function V2PrintProformaPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const { doc = 'PRO-2026-004' } = await searchParams;
  return (
    <div className="content">
      <V2PrintToolbar backHref="/documents/sales-invoice" />
      <V2PrintProforma docNo={doc} />
    </div>
  );
}
