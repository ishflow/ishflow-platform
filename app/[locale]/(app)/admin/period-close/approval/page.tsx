import { V2PeriodApproval } from '@/components/v2/admin/period-close/approval';
import { getStepNavLabels } from '@/components/v2/admin/period-close/step-nav-labels';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const DASH = '—';

export default async function V2PeriodApprovalPage() {
  const t = await getTranslations('v2_admin.periodClose.approval');
  const stepNav = await getStepNavLabels();

  // Real approver = the signed-in operator; real document count. Revenue /
  // profit / movements / period bounds are shown as "—" until the period-close
  // engine computes them — never fabricate accounting figures.
  let approver = DASH;
  let approverEmail = DASH;
  let documents = 0;
  try {
    const ctx = await requireTenantContext();
    approver =
      [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ').trim() || ctx.user.email;
    approverEmail = ctx.user.email;
    documents = await withTenant(ctx.tenant.id, (tx) =>
      (
        tx as unknown as { document_sales_invoice: { count: (a: unknown) => Promise<number> } }
      ).document_sales_invoice.count({ where: { deletedAt: null } }),
    );
  } catch {
    /* unauthenticated */
  }

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2PeriodApproval
          labels={{
            stepNav,
            cardTitle: t('cardTitle'),
            warnTitle: t('warnTitle'),
            warnBody: t('warnBody'),
            summary: [
              { label: t('summary.period'), value: DASH },
              { label: t('summary.documents'), value: String(documents) },
              { label: t('summary.movements'), value: DASH },
              { label: t('summary.revenue'), value: DASH },
              { label: t('summary.profit'), value: DASH },
            ],
            approvalLabel: t('approvalLabel'),
            approvalHint: t('approvalHint'),
            approver,
            approverEmail,
            ackText: t('ackText'),
            closeCta: t('closeCta'),
            backCta: t('backCta'),
          }}
        />
      </div>
    </>
  );
}
