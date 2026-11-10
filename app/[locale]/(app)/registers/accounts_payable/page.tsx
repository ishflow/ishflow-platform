import '@/configs';
import { renderV2RegisterView } from '@/components/v2/registers/render-register-view';

export default async function V2RegisterAPPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderV2RegisterView({
    id: 'accounts-payable',
    searchParams: await searchParams,
  });
}
