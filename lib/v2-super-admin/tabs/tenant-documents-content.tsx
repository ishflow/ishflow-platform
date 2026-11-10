import { buildListTab } from '@/lib/v2-super-admin/tabs/list-tab-template';
import { withBypass } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';

type DocRow = {
  id: string;
  module: 'sales' | 'purchases';
  number: string;
  date: Date;
  status: string;
};

function formatDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Documents tab — merged sales + purchase invoice list (most-recent first,
 * top 25). Status pill rendered via getTranslations lookup per render
 * (postedLabel / draftLabel cached at call time).
 */
export const renderTenantDocumentsTab = buildListTab<DocRow>({
  i18nNamespace: 'v2_super_admin.tenants.detail.documents',
  titleKey: 'title',
  subtitleKey: 'subtitle',
  subtitleParams: (rows) => ({ count: rows.length }),
  emptyKey: 'empty',
  loader: ({ id }) =>
    withBypass(async (tx) => {
      const txTyped = tx as {
        document_sales_invoice: {
          findMany: (
            args: unknown,
          ) => Promise<Array<{ id: string; number: string; date: Date; status: string }>>;
        };
        document_purchases_invoice: {
          findMany: (
            args: unknown,
          ) => Promise<Array<{ id: string; number: string; date: Date; status: string }>>;
        };
      };
      const [sales, purchases] = await Promise.all([
        txTyped.document_sales_invoice.findMany({
          where: { tenantId: id, deletedAt: null },
          orderBy: { date: 'desc' },
          take: 15,
          select: { id: true, number: true, date: true, status: true },
        }),
        txTyped.document_purchases_invoice.findMany({
          where: { tenantId: id, deletedAt: null },
          orderBy: { date: 'desc' },
          take: 15,
          select: { id: true, number: true, date: true, status: true },
        }),
      ]);
      const merged: DocRow[] = [
        ...sales.map((s) => ({ ...s, module: 'sales' as const })),
        ...purchases.map((p) => ({ ...p, module: 'purchases' as const })),
      ];
      return merged.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 25);
    }),
  rowKey: (r) => `${r.module}-${r.id}`,
  formatLeading: (r) => formatDateOnly(r.date),
  mono: true,
  renderRow: (r) => <DocumentRow row={r} />,
});

async function DocumentRow({ row }: { row: DocRow }) {
  const t = await getTranslations('v2_super_admin.tenants.detail.documents');
  const postedLabel = t.has('status.posted') ? t('status.posted') : 'Posted';
  const draftLabel = t.has('status.draft') ? t('status.draft') : 'Draft';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <b style={{ fontWeight: 600 }}>
        {row.module}/{row.number}
      </b>
      <span style={{ color: 'var(--text-muted)' }}>
        {row.status === 'POSTED' ? postedLabel : draftLabel}
      </span>
      <span
        className={row.status === 'POSTED' ? 'pill pill-success' : 'pill'}
        style={{ marginLeft: 'auto' }}
      >
        {row.status}
      </span>
    </div>
  );
}
