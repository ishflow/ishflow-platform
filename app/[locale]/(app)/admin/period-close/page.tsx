import { V2PeriodOverview } from '@/components/v2/admin/period-close/overview';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2PeriodOverviewPage() {
  const t = await getTranslations('v2_admin.periodClose.overview');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2PeriodOverview
          labels={{
            headTitle: t('headTitle'),
            headSub: t('headSub'),
            statusPill: t('statusPill'),
            startCta: t('startCta'),
            historyTitle: t('historyTitle'),
            historyCols: {
              period: t('historyCols.period'),
              closedAt: t('historyCols.closedAt'),
              closedBy: t('historyCols.closedBy'),
            },
            historyRows: [
              {
                period: '2025 Q4',
                closedAt: '15 Jan 2026',
                closedBy: 'Михаил Кузнецов',
                href: '/admin/period-close/closed-status',
              },
              {
                period: '2025 Q3',
                closedAt: '12 Oct 2025',
                closedBy: 'Михаил Кузнецов',
                href: '/admin/period-close/closed-status',
              },
              {
                period: '2025 Q2',
                closedAt: '14 Jul 2025',
                closedBy: 'Михаил Кузнецов',
                href: '/admin/period-close/closed-status',
              },
            ],
            historyOpenLabel: t('historyOpen'),
          }}
        />
      </div>
    </>
  );
}
