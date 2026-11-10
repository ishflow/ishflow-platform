import { V2BulkImportProgress } from '@/components/v2/admin/import/progress';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2BulkImportProgressPage() {
  const t = await getTranslations('v2_admin.orgImport.progress');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2BulkImportProgress
          labels={{
            cardTitle: t('cardTitle'),
            overall: t('overall'),
            cols: {
              entity: t('cols.entity'),
              progress: t('cols.progress'),
              state: t('cols.state'),
            },
            stateDone: t('stateDone'),
            stateInProgress: t('stateInProgress'),
            stateFailed: t('stateFailed'),
            errorsHint: t('errorsHint'),
            cancelCta: t('cancelCta'),
            finishCta: t('finishCta'),
          }}
          rows={[
            { entity: t('entities.customers'), done: 124, total: 124, state: 'done' },
            { entity: t('entities.products'), done: 84, total: 124, state: 'progress' },
            { entity: t('entities.invoices'), done: 0, total: 89, state: 'progress' },
            { entity: t('entities.warehouses'), done: 2, total: 6, state: 'failed', errorCount: 1 },
          ]}
          startedAt={t('startedAt', { when: '17 May 2026, 14:08' })}
        />
      </div>
    </>
  );
}
