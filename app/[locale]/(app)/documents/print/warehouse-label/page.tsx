import { V2PrintToolbar } from '@/components/v2/documents-extra/print/print-toolbar';
import { V2PrintWarehouseLabel } from '@/components/v2/documents-extra/print/print-warehouse-label';

export default async function V2PrintWarehouseLabelPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const { doc = 'WH-LBL-2026-042' } = await searchParams;
  return (
    <div className="content">
      <V2PrintToolbar backHref="/catalogs/warehouses" />
      <V2PrintWarehouseLabel docNo={doc} />
    </div>
  );
}
