import { SaKpiStrip } from '@/components/v2/super-admin/dashboard/sa-kpi-strip';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { getRevenueSnapshot } from '@/platform/super-admin/revenue';
import type { TenantPlan } from '@prisma/client';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const DASH = '—';
const PLAN_ORDER: TenantPlan[] = ['enterprise', 'business', 'pro', 'starter', 'free'];

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Super-admin revenue — real MRR/ARR and per-plan breakdown from
 * `getRevenueSnapshot` (active-tenant MRR by plan + currency). ARPU has no
 * paying-seat denominator in the snapshot yet, so it shows "—" instead of a
 * fabricated figure.
 */
export default async function SaRevenuePage() {
  const t = await getTranslations('v2_super_admin.revenue');
  const snapshot = await getRevenueSnapshot();
  const { totalMrrUsd, mrrByPlan, planDistribution, churn30d } = snapshot;

  const planRows = PLAN_ORDER.map((plan) => ({
    plan: capitalize(plan),
    count: planDistribution[plan],
    mrr: usd(mrrByPlan[plan]),
    share: totalMrrUsd > 0 ? Math.round((mrrByPlan[plan] / totalMrrUsd) * 100) : 0,
  }));

  return (
    <>
      <SaTopbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <SaKpiStrip
          items={[
            { label: t('kpi.mrr'), value: usd(totalMrrUsd) },
            { label: t('kpi.arr'), value: usd(totalMrrUsd * 12), note: t('kpi.note.annualised') },
            { label: t('kpi.churn30d'), value: String(churn30d), note: t('kpi.note.last30') },
            { label: t('kpi.arpu'), value: DASH },
          ]}
        />

        <section className="card">
          <div className="card-header">
            <div className="card-title">{t('planBreakdown.title')}</div>
            <span className="dim" style={{ fontSize: 12 }}>
              {t('planBreakdown.subtitle')}
            </span>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>{t('planBreakdown.col.plan')}</th>
                <th className="num">{t('planBreakdown.col.tenants')}</th>
                <th className="num">{t('planBreakdown.col.mrr')}</th>
                <th className="num">{t('planBreakdown.col.share')}</th>
              </tr>
            </thead>
            <tbody>
              {planRows.map((row) => (
                <tr key={row.plan}>
                  <td style={{ fontWeight: 600 }}>{row.plan}</td>
                  <td className="num">{row.count}</td>
                  <td className="num">{row.mrr}</td>
                  <td className="num">{row.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
