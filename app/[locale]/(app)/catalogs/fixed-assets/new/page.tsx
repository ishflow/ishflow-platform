import { renderV2CatalogNew } from '@/components/v2/catalogs/generic-catalog-page';

export default async function V2FixedAssetNewPage() {
  return renderV2CatalogNew({ slug: 'fixed-assets' });
}
