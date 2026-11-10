import { renderV2CatalogDetail } from '@/components/v2/catalogs/generic-catalog-page';

export const dynamic = 'force-dynamic';

export default async function V2CatalogsPriceTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return renderV2CatalogDetail({ slug: 'price-types', id });
}
