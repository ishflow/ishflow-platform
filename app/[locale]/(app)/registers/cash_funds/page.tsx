import '@/configs';
import { renderV2RegisterView } from '@/components/v2/registers/render-register-view';

export default async function V2RegisterCashFundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderV2RegisterView({
    id: 'cash-funds',
    searchParams: await searchParams,
  });
}
