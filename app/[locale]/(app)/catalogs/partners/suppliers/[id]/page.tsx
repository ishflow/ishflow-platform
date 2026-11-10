import { renderV2CatalogDetail } from '@/components/v2/catalogs/generic-catalog-page';

export const dynamic = 'force-dynamic';

export default async function V2CatalogsSupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  return renderV2CatalogDetail({ slug: 'suppliers', id });
}
