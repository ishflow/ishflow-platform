import { renderV2CatalogNew } from '@/components/v2/catalogs/generic-catalog-page';

export default async function V2CatalogsPriceTypeNewPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const initialKind = kind === 'dynamic' || kind === 'static' ? kind : undefined;
  return renderV2CatalogNew({
    slug: 'price-types',
    defaultValues: initialKind ? { kind: initialKind } : undefined,
  });
}
