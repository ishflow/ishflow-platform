import { renderV2CatalogDetail } from '@/components/v2/catalogs/generic-catalog-page';

export default async function V2CashRegisterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return renderV2CatalogDetail({ slug: 'cash-registers', id });
}
