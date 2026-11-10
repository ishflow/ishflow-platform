import { SaKpiStrip } from '@/components/v2/super-admin/dashboard/sa-kpi-strip';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { computeEngagement } from '@/platform/super-admin/analytics/engagement';
import { computeTopActions } from '@/platform/super-admin/analytics/top-actions';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const DASH = '—';

/**
 * Super-admin analytics — real engagement (DAU/WAU/MAU) from PlatformAuditLog
 * and top actions by volume. Session-average has no metrics pipeline yet, so
 * it shows "—" rather than a fabricated number.
 */
export default async function SaAnalyticsPage() {
  const t = await getTranslations('v2_super_admin.analytics');
  const [engagement, topActions] = await Promise.all([computeEngagement(), computeTopActions()]);

  return (
    <>
      <SaTopbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <SaKpiStrip
          items={[
            {
              label: t('kpi.dau'),
              value: engagement.dau.toLocaleString(),
              note: t('kpi.note.last7'),
            },
            {
              label: t('kpi.wau'),
              value: engagement.wau.toLocaleString(),
              note: t('kpi.note.last7'),
            },
            {
              label: t('kpi.mau'),
              value: engagement.mau.toLocaleString(),
              note: t('kpi.note.last30'),
            },
            { label: t('kpi.sessionsAvg'), value: DASH },
          ]}
        />

        <section className="card">
          <div className="card-header">
            <div className="card-title">{t('topFeatures.title')}</div>
            <span className="dim" style={{ fontSize: 12 }}>
              {t('topFeatures.subtitle')}
            </span>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>{t('topFeatures.col.feature')}</th>
                <th className="num">{t('topFeatures.col.events')}</th>
                <th className="num">{t('topFeatures.col.share')}</th>
              </tr>
            </thead>
            <tbody>
              {topActions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="dim">
                    {DASH}
                  </td>
                </tr>
              ) : (
                topActions.map((row) => (
                  <tr key={row.action}>
                    <td style={{ fontWeight: 600 }}>{row.action}</td>
                    <td className="num">{row.count.toLocaleString()}</td>
                    <td className="num">{row.share}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
