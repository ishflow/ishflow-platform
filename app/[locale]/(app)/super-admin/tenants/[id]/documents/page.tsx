import { renderV2SuperAdminCatalogDetail } from '@/components/v2/super-admin/render-sa-catalog-detail';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return renderV2SuperAdminCatalogDetail({
    catalogKey: 'super_admin.tenant',
    tabKey: 'documents',
    params,
  });
}
