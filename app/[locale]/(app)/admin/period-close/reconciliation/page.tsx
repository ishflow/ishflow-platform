import { V2PeriodReconciliation } from '@/components/v2/admin/period-close/reconciliation';
import { getStepNavLabels } from '@/components/v2/admin/period-close/step-nav-labels';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2PeriodReconciliationPage() {
  const t = await getTranslations('v2_admin.periodClose.reconciliation');
  const stepNav = await getStepNavLabels();
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2PeriodReconciliation
          labels={{
            stepNav,
            cardTitle: t('cardTitle'),
            cardSub: t('cardSub'),
            cols: {
              account: t('cols.account'),
              ledger: t('cols.ledger'),
              external: t('cols.external'),
              diff: t('cols.diff'),
              state: t('cols.state'),
            },
            stateOk: t('stateOk'),
            stateDiff: t('stateDiff'),
            nextCta: t('nextCta'),
            backCta: t('backCta'),
          }}
          // No external bank feed is connected, so there is nothing to
          // reconcile against — render an empty table rather than fabricated
          // ledger/external balances. Real reconciliation lands with the bank
          // integration (documented follow-up).
          rows={[]}
        />
      </div>
    </>
  );
}
