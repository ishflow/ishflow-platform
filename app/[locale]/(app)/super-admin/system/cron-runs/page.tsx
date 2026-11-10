import { renderV2SuperAdminCatalog } from '@/components/v2/super-admin/render-sa-catalog';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderV2SuperAdminCatalog({
    slug: 'super_admin.cron_run',
    searchParams: await searchParams,
  });
}
