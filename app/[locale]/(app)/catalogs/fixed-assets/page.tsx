import { renderV2CatalogList } from '@/components/v2/catalogs/render-catalog-list';

export const dynamic = 'force-dynamic';

/**
 * `assets.fixed_asset` list view. Runs through the generic `renderV2CatalogList`
 * shell (same one the super-admin catalogs use) — table columns + search + the
 * permission-gated "New" CTA all come from the catalog's `list` config.
 */
export default async function V2FixedAssetsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderV2CatalogList({ slug: 'fixed-assets', searchParams: await searchParams });
}
