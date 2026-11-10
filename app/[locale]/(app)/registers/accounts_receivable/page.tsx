import '@/configs';
import { renderV2RegisterView } from '@/components/v2/registers/render-register-view';

export default async function V2RegisterARPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderV2RegisterView({
    id: 'accounts-receivable',
    searchParams: await searchParams,
  });
}
