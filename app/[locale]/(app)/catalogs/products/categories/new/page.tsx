import { renderV2CatalogNew } from '@/components/v2/catalogs/generic-catalog-page';

export default async function V2CatalogsCategoryNewPage() {
  return renderV2CatalogNew({ slug: 'product-categories' });
}
