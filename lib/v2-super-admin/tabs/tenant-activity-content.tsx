import { buildListTab } from '@/lib/v2-super-admin/tabs/list-tab-template';
import { withBypass } from '@/platform/db/tenant-context';

type AuditRow = {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  createdAt: Date;
};

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pillForAction(action: string): string {
  const a = action.toLowerCase();
  if (a === 'create' || a === 'post') return 'pill pill-success';
  if (a === 'delete') return 'pill pill-danger';
  if (a === 'login' || a === 'update') return 'pill pill-info';
  return 'pill';
}

export const renderTenantActivityTab = buildListTab<AuditRow>({
  i18nNamespace: 'v2_super_admin.tenants.detail.activity',
  titleKey: 'title',
  subtitleKey: 'subtitle',
  emptyKey: 'empty',
  loader: ({ id }) =>
    withBypass(async (tx) => {
      const txTyped = tx as {
        auditLog: {
          findMany: (args: unknown) => Promise<AuditRow[]>;
        };
      };
      return txTyped.auditLog.findMany({
        where: { tenantId: id },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: { id: true, entity: true, entityId: true, action: true, createdAt: true },
      });
    }),
  rowKey: (r) => r.id,
  formatLeading: (r) => formatTimestamp(r.createdAt),
  mono: true,
  renderRow: (r) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <b style={{ fontWeight: 600 }}>
        {r.entity}/{r.entityId.slice(0, 12)}
      </b>
      <span style={{ color: 'var(--text-muted)' }}>{r.action}</span>
      <span className={pillForAction(r.action)} style={{ marginLeft: 'auto' }}>
        {r.action.toUpperCase()}
      </span>
    </div>
  ),
});
