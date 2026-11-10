import { TagsPanel } from '@/components/app/super-admin/tenants/tags-panel';
import { getTenantOverview } from '@/platform/super-admin/tenant-detail';
import { getTenantProDict } from '@/platform/super-admin/tenants/dict';
import { listTenantTags } from '@/platform/super-admin/tenants/tags';
import { notFound } from 'next/navigation';
import { addTagAction, removeTagAction } from '../_actions/tags';

export const dynamic = 'force-dynamic';

export default async function TenantTagsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [overview, dict, tags] = await Promise.all([
    getTenantOverview(tenantId),
    getTenantProDict(),
    listTenantTags(tenantId),
  ]);
  if (!overview) notFound();

  return (
    <TagsPanel
      tenantId={tenantId}
      tags={tags}
      dict={dict.tags}
      addAction={addTagAction}
      removeAction={removeTagAction}
    />
  );
}
