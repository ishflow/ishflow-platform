import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { withBypass } from '@/platform/db/tenant-context';
import { Link } from '@/platform/i18n/navigation';
import type { AnnouncementStatus } from '@prisma/client';
import { BarChart3, Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getSaCommsDict } from './_sa-dict';

export const dynamic = 'force-dynamic';

const statusPill: Record<AnnouncementStatus, string> = {
  live: 'pill pill-success',
  scheduled: 'pill pill-warning',
  draft: 'pill pill-neutral',
  archived: 'pill pill-neutral',
};

const isoDate = (dt: Date | null) => (dt ? new Date(dt).toISOString().slice(0, 10) : '—');

/**
 * Super-admin Communications — real in-app announcements from
 * `marketingAnnouncement` (cross-tenant, operator scope). No fabricated
 * campaigns; surfaces/statuses are the genuine announcement model.
 */
export default async function SaCommsListPage() {
  const [t, d, rows] = await Promise.all([
    getTranslations('v2_super_admin.comms.list'),
    getSaCommsDict(),
    withBypass((tx) =>
      tx.marketingAnnouncement.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    ),
  ]);

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={d.title}
          subtitle={d.subtitle}
          actions={
            <>
              <Link href="/super-admin/comms/analytics" className="btn btn-secondary btn-sm">
                <BarChart3 size={14} strokeWidth={1.75} />
                {t('analytics')}
              </Link>
              <Link href="/super-admin/comms/new" className="btn btn-primary btn-sm">
                <Plus size={14} strokeWidth={1.75} />
                {d.actions.new}
              </Link>
            </>
          }
        />
      }
    >
      <SaTenantSection title={d.title}>
        {rows.length === 0 ? (
          <p className="dim" style={{ padding: '8px 0' }}>
            {d.list.empty}
          </p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>{d.columns.internalKey}</th>
                <th>{d.columns.surface}</th>
                <th>{d.columns.status}</th>
                <th>{d.columns.startAt}</th>
                <th>{d.columns.createdAt}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link
                      href={`/super-admin/comms/${r.id}`}
                      style={{ color: 'var(--text)', textDecoration: 'none' }}
                    >
                      {r.internalKey}
                    </Link>
                  </td>
                  <td>{d.surfaces[r.surface]}</td>
                  <td>
                    <span className={statusPill[r.status]}>{d.statuses[r.status]}</span>
                  </td>
                  <td>{isoDate(r.startAt)}</td>
                  <td>{isoDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
