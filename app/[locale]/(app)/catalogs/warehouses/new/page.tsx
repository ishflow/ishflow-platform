import { renderV2CatalogNew } from '@/components/v2/catalogs/generic-catalog-page';

/**
 * V2 warehouse "new" page — generic V2EntityForm driven by
 * `configs/inventory/catalogs/warehouse.ts` DSL. The bespoke
 * `V2WarehouseDetail` form was retired in favor of the metadata-driven
 * shell; the engine handles validation, RLS, audit, and code
 * auto-generation identically to V1.
 */
export default async function V2WarehouseNewPage() {
  return renderV2CatalogNew({ slug: 'warehouses' });
}
