import { type SaTenantRecord, loadSaTenant } from '@/lib/v2-super-admin/load-tenant';
import {
  type SaTenantMetrics,
  loadSaTenantMetrics,
} from '@/lib/v2-super-admin/load-tenant-metrics';
import { buildInfoRowsTab } from '@/lib/v2-super-admin/tabs/info-rows-template';

type VitalsData = SaTenantRecord & SaTenantMetrics;

function formatTimestamp(d: Date | null): string {
  if (!d) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TODO_PILL = { textKey: 'placeholderTodo', cls: 'pill' };

async function loadVitalsBundle(id: string): Promise<VitalsData | null> {
  const [tenant, metrics] = await Promise.all([loadSaTenant(id), loadSaTenantMetrics(id)]);
  if (!tenant) return null;
  return { ...tenant, ...metrics };
}

export const renderTenantVitalsTab = buildInfoRowsTab<VitalsData>({
  i18nNamespace: 'v2_super_admin.tenants.detail.vitals',
  loader: ({ id }) => loadVitalsBundle(id),
  sections: [
    {
      titleKey: 'health.title',
      subtitleKey: 'health.subtitle',
      rows: [
        { labelKey: 'health.lastWrite', value: (d) => formatTimestamp(d.lastActivityAt) },
        { labelKey: 'health.lastSync', value: (d) => formatTimestamp(d.lastSyncAt) },
        { labelKey: 'health.queueDepth', pill: () => TODO_PILL },
        { labelKey: 'health.errorRate24h', pill: () => TODO_PILL },
        {
          labelKey: 'health.failedPayments30d',
          node: (d) => (
            <span className={d.failedPayments30d > 0 ? 'pill pill-danger' : 'pill pill-success'}>
              {d.failedPayments30d}
            </span>
          ),
        },
      ],
    },
    {
      titleKey: 'usage.title',
      subtitleKey: 'usage.subtitle',
      rows: [
        { labelKey: 'usage.members', value: (t) => t.members },
        { labelKey: 'usage.invoices', value: (t) => t.invoices },
        { labelKey: 'usage.plan', value: (t) => t.plan },
        { labelKey: 'usage.createdAt', value: (t) => formatTimestamp(t.createdAt) },
      ],
    },
  ],
});
