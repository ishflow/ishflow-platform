import { V2PeriodClosedStatus } from '@/components/v2/admin/period-close/closed-status';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2PeriodClosedStatusPage() {
  const t = await getTranslations('v2_admin.periodClose.closedStatus');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2PeriodClosedStatus
          labels={{
            bannerTitle: t('bannerTitle'),
            bannerBody: t('bannerBody'),
            summaryTitle: t('summaryTitle'),
            // Period-close state is not persisted yet (documented follow-up),
            // so there is no real closed period to summarise — show "—" rather
            // than a fabricated closed period / approver / figures.
            summary: [
              { label: t('summary.period'), value: '—' },
              { label: t('summary.closedAt'), value: '—' },
              { label: t('summary.closedBy'), value: '—' },
              { label: t('summary.documents'), value: '—' },
              { label: t('summary.revenue'), value: '—' },
            ],
            revertCta: t('revertCta'),
            revertHint: t('revertHint'),
            backCta: t('backCta'),
          }}
        />
      </div>
    </>
  );
}
