import { renderV2CatalogDetail } from '@/components/v2/catalogs/generic-catalog-page';

export const dynamic = 'force-dynamic';

export default async function V2CatalogsSpecialPriceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return renderV2CatalogDetail({ slug: 'price-agreements', id });
}
