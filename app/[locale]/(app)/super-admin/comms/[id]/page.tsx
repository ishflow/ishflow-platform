import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaKpiStrip } from '@/components/v2/super-admin/dashboard/sa-kpi-strip';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import {
  SaTenantInfoRow,
  SaTenantSection,
} from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { withBypass } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { publishComms, recallComms } from '../_actions';
import { getSaCommsDict } from '../_sa-dict';

export const dynamic = 'force-dynamic';

const pct = (f: number) => `${(f * 100).toFixed(1)}%`;
const isoMin = (dt: Date | null) =>
  dt ? new Date(dt).toISOString().slice(0, 16).replace('T', ' ') : '—';

/**
 * Super-admin announcement detail — real `marketingAnnouncement` + genuine
 * engagement metrics from `userAnnouncementState` (impressions / unique
 * viewers / dismissal rate / click-through). Publish + recall are real,
 * audit-logged server actions. No fabricated email metrics.
 */
export default async function SaCommsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [t, d, data] = await Promise.all([
    getTranslations('v2_super_admin.comms.detail'),
    getSaCommsDict(),
    withBypass(async (tx) => {
      const row = await tx.marketingAnnouncement.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!row) return null;
      const states = await tx.userAnnouncementState.findMany({
        where: { announcementId: id },
        select: {
          impressionCount: true,
          viewedAt: true,
          dismissedAt: true,
          clickedThroughAt: true,
        },
        take: 20000,
      });
      const impressions = states.reduce((s, x) => s + x.impressionCount, 0);
      const viewers = states.filter((x) => x.viewedAt !== null).length;
      const dismissed = states.filter((x) => x.dismissedAt !== null).length;
      const clicked = states.filter((x) => x.clickedThroughAt !== null).length;
      return {
        row,
        impressions,
        viewers,
        dismissalRate: viewers > 0 ? dismissed / viewers : 0,
        ctr: viewers > 0 ? clicked / viewers : 0,
      };
    }),
  ]);

  if (!data) notFound();
  const { row, impressions, viewers, dismissalRate, ctr } = data;
  const tr = row.translations[0];

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={row.internalKey}
          subtitle={d.statuses[row.status]}
          actions={
            row.status === 'live' ? (
              <form action={recallComms}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="btn btn-secondary btn-sm">
                  {d.actions.recall}
                </button>
              </form>
            ) : (
              <form action={publishComms}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="btn btn-primary btn-sm">
                  {d.actions.publish}
                </button>
              </form>
            )
          }
        />
      }
    >
      <SaKpiStrip
        items={[
          { label: d.analytics.impressions, value: impressions.toLocaleString() },
          { label: d.analytics.uniqueViewers, value: viewers.toLocaleString() },
          { label: d.analytics.dismissalRate, value: pct(dismissalRate) },
          { label: d.analytics.ctr, value: pct(ctr) },
        ]}
      />

      <SaTenantSection title={t('meta.title')}>
        <SaTenantInfoRow k={d.columns.internalKey} v={row.internalKey} mono />
        <SaTenantInfoRow k={d.columns.surface} v={d.surfaces[row.surface]} />
        <SaTenantInfoRow k={d.columns.status} v={d.statuses[row.status]} />
        <SaTenantInfoRow k={d.columns.startAt} v={isoMin(row.startAt)} mono />
        <SaTenantInfoRow k={d.columns.endAt} v={isoMin(row.endAt)} mono />
      </SaTenantSection>

      {tr ? (
        <>
          <div className="spacer" />
          <SaTenantSection title={tr.title}>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{tr.body}</p>
          </SaTenantSection>
        </>
      ) : null}
    </SaCmsPageShell>
  );
}
