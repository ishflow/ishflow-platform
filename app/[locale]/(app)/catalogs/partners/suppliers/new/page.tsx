import { renderV2CatalogNew } from '@/components/v2/catalogs/generic-catalog-page';

export default async function V2CatalogsSupplierNewPage() {
  return renderV2CatalogNew({ slug: 'suppliers' });
}
