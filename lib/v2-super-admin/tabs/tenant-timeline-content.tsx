import { buildListTab } from '@/lib/v2-super-admin/tabs/list-tab-template';
import { withBypass } from '@/platform/db/tenant-context';

const LIFECYCLE_ENTITIES = ['Tenant', 'TenantSettings', 'TenantSuspension', 'Membership'];

type TimelineRow = {
  id: string;
  entity: string;
  action: string;
  createdAt: Date;
};

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const renderTenantTimelineTab = buildListTab<TimelineRow>({
  i18nNamespace: 'v2_super_admin.tenants.detail.timeline',
  titleKey: 'title',
  subtitleKey: 'subtitle',
  emptyKey: 'empty',
  loader: ({ id }) =>
    withBypass(async (tx) => {
      const txTyped = tx as {
        auditLog: {
          findMany: (args: unknown) => Promise<TimelineRow[]>;
        };
      };
      return txTyped.auditLog.findMany({
        where: { tenantId: id, entity: { in: LIFECYCLE_ENTITIES } },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: { id: true, entity: true, action: true, createdAt: true },
      });
    }),
  rowKey: (r) => r.id,
  formatLeading: (r) => formatTimestamp(r.createdAt),
  mono: true,
  renderRow: (r) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <b style={{ fontWeight: 600 }}>{r.entity}</b>
      <span style={{ color: 'var(--text-muted)' }}>{r.action}</span>
    </div>
  ),
});
