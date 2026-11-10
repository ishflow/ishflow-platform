import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaKpiStrip } from '@/components/v2/super-admin/dashboard/sa-kpi-strip';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { withBypass } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';
import { getSaCommsDict } from '../_sa-dict';

export const dynamic = 'force-dynamic';

const pct = (f: number) => `${(f * 100).toFixed(1)}%`;

interface Bucket {
  id: string;
  key: string;
  impressions: number;
  viewed: number;
  clicked: number;
}

/**
 * Super-admin communications analytics — real cross-announcement engagement
 * aggregated from `userAnnouncementState` (impressions / unique viewers /
 * dismissal rate / click-through). In-app announcement metrics, not fabricated
 * email open/click/bounce rates.
 */
export default async function SaCommsAnalyticsPage() {
  const [t, d, data] = await Promise.all([
    getTranslations('v2_super_admin.comms.analyticsPage'),
    getSaCommsDict(),
    withBypass(async (tx) => {
      const anns = await tx.marketingAnnouncement.findMany({
        select: { id: true, internalKey: true },
      });
      const keyOf = new Map(anns.map((a) => [a.id, a.internalKey]));
      const states = await tx.userAnnouncementState.findMany({
        select: {
          announcementId: true,
          impressionCount: true,
          viewedAt: true,
          dismissedAt: true,
          clickedThroughAt: true,
        },
        take: 20000,
      });

      const buckets = new Map<string, Bucket>();
      let totalImpressions = 0;
      let totalViewers = 0;
      let totalClicked = 0;
      let totalDismissed = 0;
      for (const s of states) {
        const b = buckets.get(s.announcementId) ?? {
          id: s.announcementId,
          key: keyOf.get(s.announcementId) ?? s.announcementId,
          impressions: 0,
          viewed: 0,
          clicked: 0,
        };
        b.impressions += s.impressionCount;
        totalImpressions += s.impressionCount;
        if (s.viewedAt) {
          b.viewed += 1;
          totalViewers += 1;
        }
        if (s.clickedThroughAt) {
          b.clicked += 1;
          totalClicked += 1;
        }
        if (s.dismissedAt) totalDismissed += 1;
        buckets.set(s.announcementId, b);
      }
      const rows = Array.from(buckets.values())
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 50);
      return {
        rows,
        totalImpressions,
        totalViewers,
        dismissalRate: totalViewers > 0 ? totalDismissed / totalViewers : 0,
        ctr: totalViewers > 0 ? totalClicked / totalViewers : 0,
      };
    }),
  ]);

  const { rows, totalImpressions, totalViewers, dismissalRate, ctr } = data;

  return (
    <SaCmsPageShell
      topbar={<SaTopbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />}
    >
      <SaKpiStrip
        items={[
          { label: d.analytics.impressions, value: totalImpressions.toLocaleString() },
          { label: d.analytics.uniqueViewers, value: totalViewers.toLocaleString() },
          { label: d.analytics.dismissalRate, value: pct(dismissalRate) },
          { label: d.analytics.ctr, value: pct(ctr) },
        ]}
      />

      <SaTenantSection title={d.analytics.perTenantTitle}>
        {rows.length === 0 ? (
          <p className="dim" style={{ padding: '8px 0' }}>
            {d.analytics.perTenantEmpty}
          </p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>{d.columns.internalKey}</th>
                <th className="num">{d.analytics.columns.impressions}</th>
                <th className="num">{d.analytics.columns.viewed}</th>
                <th className="num">{d.analytics.columns.clicked}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.key}</td>
                  <td className="num">{r.impressions.toLocaleString()}</td>
                  <td className="num">{r.viewed.toLocaleString()}</td>
                  <td className="num">{r.clicked.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
