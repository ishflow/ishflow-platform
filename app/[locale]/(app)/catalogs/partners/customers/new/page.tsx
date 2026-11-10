import { renderV2CatalogNew } from '@/components/v2/catalogs/generic-catalog-page';

export default async function V2CatalogsCustomerNewPage() {
  return renderV2CatalogNew({ slug: 'customers' });
}
