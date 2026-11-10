import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { ApproveUpgradeDialog } from '@/components/v2/super-admin/upgrades/approve-dialog';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function UpgradeRequestsPage() {
  await assertSuperAdmin();
  const t = await getTranslations('v2_super_admin.upgrades');

  const rows = await withBypass((tx) =>
    tx.upgradeRequest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    }),
  );
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  return (
    <>
      <SaTopbar
        breadcrumb={t('breadcrumb')}
        title={t('title')}
        subtitle={t('pendingCount', { count: pendingCount })}
      />
      <div className="content">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t('col.company')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('col.email')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('col.phone')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('col.requested')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('col.status')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('col.payment')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('col.action')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{r.companyName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.contactEmail}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.contactPhone}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.requestedPlan ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          r.status === 'pending'
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        }
                      >
                        {t(`status_${r.status}` as 'status_pending')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.status === 'approved'
                        ? `${r.paymentAmount ?? '—'} ${r.paymentCurrency ?? ''} · ${r.paymentMethod ?? '—'}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.status === 'pending' ? (
                        <ApproveUpgradeDialog
                          requestId={r.id}
                          tenantId={r.tenantId}
                          defaultPlan={r.requestedPlan}
                          triggerLabel={t('approve.trigger')}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
