import '@/configs';
import { renderV2RegisterView } from '@/components/v2/registers/render-register-view';

export default async function V2RegisterProductPricesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderV2RegisterView({ id: 'product-prices', searchParams: await searchParams });
}
