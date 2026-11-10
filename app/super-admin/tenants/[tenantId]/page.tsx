import { StatCard } from '@/components/app/super-admin/stat-card';
import { OperatorActionBar } from '@/components/app/super-admin/tenants/operator-action-bar';
import { TagsPanel } from '@/components/app/super-admin/tenants/tags-panel';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getTenantOverview } from '@/platform/super-admin/tenant-detail';
import { getTenantProDict } from '@/platform/super-admin/tenants/dict';
import { listTenantTags } from '@/platform/super-admin/tenants/tags';
import { notFound } from 'next/navigation';
import { addTagAction, removeTagAction } from './_actions/tags';
import {
  archiveTenantAction,
  hardDeleteTenantAction,
  liftSuspensionAction,
  restoreTenantAction,
  suspendTenantAction,
  transferOwnershipAction,
  wipeTenantDataAction,
} from './_actions/tenant-ops';

export const dynamic = 'force-dynamic';

function formatDate(value: Date | null | undefined, dash: string): string {
  if (!value) return dash;
  return value.toISOString().slice(0, 10);
}

export default async function TenantOverviewPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [overview, dict, proDict, tags] = await Promise.all([
    getTenantOverview(tenantId),
    getSuperAdminDict(),
    getTenantProDict(),
    listTenantTags(tenantId),
  ]);
  if (!overview) notFound();

  const { tenant, ownerCount, totalDocs, mrrUsd } = overview;
  const o = dict.tenantDetail.overview;
  const hint =
    tenant.status === 'active'
      ? o.mrrHintActive
      : o.mrrHintNonActive.replace('{status}', dict.subscription.statusOptions[tenant.status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={o.created} value={formatDate(tenant.createdAt, dict.common.dash)} />
        <StatCard label={o.currency} value={tenant.currency} />
        <StatCard label={o.locale} value={tenant.defaultLocale} />
        <StatCard label={o.owners} value={ownerCount.toString()} />
        <StatCard label={o.totalDocuments} value={totalDocs.toLocaleString()} />
        <StatCard label={o.mrr} value={`$${mrrUsd.toFixed(2)}`} hint={hint} />
      </div>

      <OperatorActionBar
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        tenantStatus={tenant.status}
        isArchived={Boolean(tenant.deletedAt)}
        dict={proDict.actionBar}
        actions={{
          suspend: suspendTenantAction,
          lift: liftSuspensionAction,
          archive: archiveTenantAction,
          restore: restoreTenantAction,
          hardDelete: hardDeleteTenantAction,
          transfer: transferOwnershipAction,
          wipe: wipeTenantDataAction,
        }}
      />

      <TagsPanel
        tenantId={tenant.id}
        tags={tags}
        dict={proDict.tags}
        addAction={addTagAction}
        removeAction={removeTagAction}
      />
    </div>
  );
}
