import {
  ActivityTable,
  type ActivityTableRow,
} from '@/components/app/super-admin/record-inspector';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getTenantActivity } from '@/platform/super-admin/tenant-detail';

export const dynamic = 'force-dynamic';

export default async function TenantActivityPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [{ rows }, dict] = await Promise.all([
    getTenantActivity(tenantId, { limit: 100 }),
    getSuperAdminDict(),
  ]);

  const clientRows: ActivityTableRow[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userEmail: r.userEmail,
    entity: r.entity,
    entityId: r.entityId,
    action: r.action,
    before: r.before,
    after: r.after,
    createdAt: r.createdAt.toISOString(),
  }));

  const a = dict.tenantDetail.activity;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        {a.title.replace('{count}', String(clientRows.length))}
      </h2>
      <ActivityTable
        rows={clientRows}
        dict={{
          columns: a.columns,
          empty: a.empty,
          inspector: a.inspector,
          common: { close: dict.common.close, dash: dict.common.dash },
        }}
      />
    </div>
  );
}
