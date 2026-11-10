import { SaEventsCard } from '@/components/v2/super-admin/dashboard/sa-events-card';
import { SaKpiStrip } from '@/components/v2/super-admin/dashboard/sa-kpi-strip';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { withBypass } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const DASH = '—';

type AuditRow = {
  action: string;
  entity: string;
  createdAt: Date;
  tenant: { name: string } | null;
};

function eventTag(action: string): 'up' | 'down' | 'warn' | 'info' {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('unpost') || a.includes('suspend') || a.includes('revoke'))
    return 'warn';
  if (a.includes('create') || a.includes('post') || a.includes('approve')) return 'up';
  if (a.includes('fail') || a.includes('error')) return 'down';
  return 'info';
}

/**
 * Super-admin dashboard — operator overview. Cross-tenant aggregates pulled
 * via `withBypass` (operator scope). MRR / churn / DAU are shown as "—" until
 * the metrics pipeline lands — we never fabricate those numbers.
 */
export default async function SaDashboardPage() {
  const t = await getTranslations('v2_super_admin.dashboard');

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const data = await withBypass(async (tx) => {
    const [newToday, active, trialing, suspended, openSupport, failed24h, auditRows] =
      await Promise.all([
        tx.tenant.count({ where: { createdAt: { gte: startToday }, deletedAt: null } }),
        tx.tenant.count({ where: { status: 'active', deletedAt: null } }),
        tx.tenant.count({ where: { status: 'trialing', deletedAt: null } }),
        tx.tenant.count({ where: { status: 'suspended', deletedAt: null } }),
        tx.supportTicket.count({ where: { status: 'open' } }),
        tx.billingEvent.count({
          where: { type: { contains: 'failed' }, createdAt: { gte: dayAgo } },
        }),
        tx.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            action: true,
            entity: true,
            createdAt: true,
            tenant: { select: { name: true } },
          },
        }) as Promise<AuditRow[]>,
      ]);
    return { newToday, active, trialing, suspended, openSupport, failed24h, auditRows };
  });

  const fmtTime = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm} ${hh}:${mi}`;
  };

  const events = data.auditRows.map((r) => ({
    time: fmtTime(new Date(r.createdAt)),
    subject: r.tenant?.name ?? r.entity,
    detail: `${r.action} · ${r.entity}`,
    tag: eventTag(r.action),
    tagLabel: r.action,
  }));

  const nowLabel = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  return (
    <>
      <SaTopbar
        breadcrumb={t('breadcrumb')}
        title={t('title')}
        subtitle={t('subtitle', { tenants: t('subtitleTenantsAll'), date: nowLabel })}
      />
      <div className="content">
        <SaKpiStrip
          items={[
            { label: t('kpi.newTenantsToday'), value: String(data.newToday) },
            { label: t('kpi.mrr'), value: DASH },
            { label: t('kpi.churn30d'), value: DASH },
            { label: t('kpi.dau'), value: DASH },
          ]}
        />

        <SaKpiStrip
          columns="repeat(3, 1fr)"
          items={[
            { label: t('kpi.openSupport'), value: String(data.openSupport) },
            {
              label: t('kpi.activeTenants'),
              value: String(data.active),
              note: t('kpi.note.trialAndSuspended', {
                trial: data.trialing,
                suspended: data.suspended,
              }),
            },
            { label: t('kpi.failedPayments24h'), value: String(data.failed24h) },
          ]}
        />

        <SaEventsCard
          title={t('events.title')}
          linkHref="/super-admin/audit"
          linkLabel={t('events.viewAll')}
          events={events}
        />
      </div>
    </>
  );
}
