import { V2PeriodChecklist } from '@/components/v2/admin/period-close/checklist';
import { getStepNavLabels } from '@/components/v2/admin/period-close/step-nav-labels';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function V2PeriodChecklistPage() {
  const t = await getTranslations('v2_admin.periodClose.checklist');
  const stepNav = await getStepNavLabels();

  // Real document counts (sales invoices) — replaces the hardcoded "89 / 3"
  // that previously showed even on an empty tenant. SAVED = unposted draft.
  let posted = 0;
  let unposted = 0;
  try {
    const ctx = await requireTenantContext();
    const counts = await withTenant(ctx.tenant.id, async (tx) => {
      const bag = tx as unknown as {
        document_sales_invoice: { count: (a: unknown) => Promise<number> };
      };
      const [total, draft] = await Promise.all([
        bag.document_sales_invoice.count({ where: { deletedAt: null } }),
        bag.document_sales_invoice.count({ where: { deletedAt: null, status: 'SAVED' } }),
      ]);
      return { posted: total - draft, unposted: draft };
    });
    posted = counts.posted;
    unposted = counts.unposted;
  } catch {
    /* unauthenticated — render with zero counts */
  }

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2PeriodChecklist
          labels={{
            stepNav,
            cardTitle: t('cardTitle'),
            cardSub: t('cardSub'),
            nextCta: t('nextCta'),
            backCta: t('backCta'),
          }}
          items={[
            {
              id: 'docs',
              state: 'done',
              title: t('items.docs.title'),
              meta: t('items.docs.meta', { count: posted }),
            },
            {
              id: 'unposted',
              state: unposted > 0 ? 'warn' : 'done',
              title: t('items.unposted.title', { count: unposted }),
              meta: t('items.unposted.meta'),
              cta: unposted > 0 ? t('items.unposted.cta') : undefined,
            },
            {
              id: 'reconcile',
              state: 'open',
              title: t('items.reconcile.title'),
              meta: t('items.reconcile.meta'),
            },
            {
              id: 'approval',
              state: 'open',
              title: t('items.approval.title'),
              meta: t('items.approval.meta'),
            },
          ]}
        />
      </div>
    </>
  );
}
