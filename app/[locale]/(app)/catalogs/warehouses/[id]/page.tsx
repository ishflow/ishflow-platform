import { renderV2CatalogDetail } from '@/components/v2/catalogs/generic-catalog-page';

/**
 * V2 warehouse edit page — generic V2EntityForm driven by
 * `configs/inventory/catalogs/warehouse.ts` DSL. Replaces the placeholder
 * bespoke detail that previously displayed `id` as title without any DB
 * read or save action.
 */
export default async function V2WarehouseDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return renderV2CatalogDetail({ slug: 'warehouses', id });
}
