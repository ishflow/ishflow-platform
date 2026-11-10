import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { Link } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';
import { Plus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

type BankRow = {
  id: string;
  name: string;
  bankName: string | null;
  accountNo: string;
  currency: string;
};

export default async function V2BankAccountsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('v2_catalogs.bankAccounts');

  let rows: BankRow[] = [];
  try {
    const ctx = await requireTenantContext();
    const tenantId = ctx.tenant?.id ?? '';
    if (tenantId) {
      rows = (await withTenant(tenantId, (tx) =>
        (
          tx as unknown as {
            bankAccount: { findMany: (a: unknown) => Promise<BankRow[]> };
          }
        ).bankAccount.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true, bankName: true, accountNo: true, currency: true },
        }),
      )) as BankRow[];
    }
  } catch {
    // Unauthenticated — render chrome with an empty list.
  }

  return (
    <>
      <V2Topbar
        breadcrumb={t('breadcrumb')}
        title={t('title')}
        subtitle={t('subtitleCount', { count: rows.length })}
      />
      <div className="content">
        <section className="table-card">
          <div className="table-toolbar">
            <div className="left">
              <strong style={{ fontSize: 14 }}>
                {t('title')}{' '}
                <span className="dim" style={{ fontWeight: 400 }}>
                  ({rows.length})
                </span>
              </strong>
            </div>
            <div className="right">
              <Link href="/catalogs/bank-accounts/new" className="btn btn-primary btn-sm">
                <Plus size={14} strokeWidth={1.75} />
                {t('new')}
              </Link>
            </div>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>{t('col.name')}</th>
                <th>{t('col.bank')}</th>
                <th>{t('col.accountNo')}</th>
                <th>{t('col.currency')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="row-title">{r.name}</div>
                    </td>
                    <td>{r.bankName || <span className="dim">—</span>}</td>
                    <td className="mono">{r.accountNo}</td>
                    <td>{r.currency}</td>
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
