import {
  type PaymentSentRow,
  V2PaymentSentList,
} from '@/components/v2/documents-extra/payment-sent/list';
import { V2ListPager } from '@/components/v2/shell/list-pager';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { formatMoney } from '@/lib/format-money';
import { DEFAULT_PAGE_SIZE, pageOffset, parsePage } from '@/lib/list/pagination';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function V2PaymentSentListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations('v2_documents_extra.paymentSent');
  const locale = await getLocale();
  const page = parsePage((await searchParams).page);

  let tenantId = '';
  let currency = 'USD';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
    currency = ctx.tenant?.currency ?? 'USD';
  } catch {
    // Unauthenticated.
  }

  type Row = {
    id: string;
    number: string;
    date: Date;
    supplier: string;
    amount: number;
    status: string;
    supplierName: string;
  };

  let rows: Row[] = [];
  let counts = { all: 0, posted: 0, saved: 0, failed: 0 };
  if (tenantId) {
    const result = await withTenant(tenantId, async (tx) => {
      const where = { deletedAt: null };
      const [allC, postedC, savedC, failedC, docs] = await Promise.all([
        tx.document_purchases_payment_sent.count({ where }),
        tx.document_purchases_payment_sent.count({ where: { ...where, status: 'POSTED' } }),
        tx.document_purchases_payment_sent.count({ where: { ...where, status: 'SAVED' } }),
        tx.document_purchases_payment_sent.count({ where: { ...where, status: 'FAILED' } }),
        tx.document_purchases_payment_sent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: pageOffset(page),
          take: DEFAULT_PAGE_SIZE,
          select: {
            id: true,
            number: true,
            date: true,
            supplier: true,
            amount: true,
            status: true,
          },
        }),
      ]);
      const cnt = { all: allC, posted: postedC, saved: savedC, failed: failedC };
      if (docs.length === 0) return { rows: [] as Row[], counts: cnt };

      const supplierIds = Array.from(new Set(docs.map((r) => r.supplier)));
      const suppliers = await tx.catalog_purchases_supplier.findMany({
        where: { id: { in: supplierIds } },
        select: { id: true, name: true },
      });
      const supMap = new Map(suppliers.map((s) => [s.id, s.name]));

      return {
        rows: docs.map((d) => ({
          id: d.id,
          number: d.number,
          date: d.date,
          supplier: d.supplier,
          amount: Number(d.amount),
          status: d.status,
          supplierName: supMap.get(d.supplier) ?? d.supplier.slice(0, 8),
        })),
        counts: cnt,
      };
    });

    rows = result.rows;
    counts = result.counts;
  }

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  const fmtMoney = (n: number) => formatMoney(n, locale, currency);

  const statusTone = (s: string): 'success' | 'warning' | 'danger' | 'neutral' =>
    s === 'POSTED' ? 'success' : s === 'FAILED' ? 'danger' : 'warning';
  const statusLabel = (s: string) =>
    s === 'POSTED'
      ? t('list.status.posted')
      : s === 'FAILED'
        ? t('list.status.failed')
        : t('list.status.saved');

  const tableRows: PaymentSentRow[] = rows.map((r) => ({
    id: r.id,
    docNo: r.number,
    date: fmtDate(r.date),
    supplier: r.supplierName,
    amount: fmtMoney(r.amount),
    method: { label: '—', tone: 'neutral' },
    relatedInvoice: '—',
    status: { label: statusLabel(r.status), tone: statusTone(r.status) },
    detailHref: `/purchases/payment-sent/${r.id}`,
  }));

  return (
    <>
      <V2Topbar
        breadcrumb={t('list.breadcrumb')}
        title={t('list.title')}
        subtitle={t('list.subtitle', { count: counts.all })}
      />
      <div className="content">
        <V2PaymentSentList
          columns={{
            no: t('list.col.no'),
            status: t('list.col.status'),
            date: t('list.col.date'),
            supplier: t('list.col.supplier'),
            amount: t('list.col.amount'),
            method: t('list.col.method'),
            related: t('list.col.related'),
          }}
          statuses={[
            { key: 'all', label: t('list.status.all'), count: counts.all },
            { key: 'success', label: t('list.status.posted'), count: counts.posted },
            { key: 'warning', label: t('list.status.saved'), count: counts.saved },
            { key: 'danger', label: t('list.status.failed'), count: counts.failed },
          ]}
          searchPlaceholder={t('list.search')}
          filterLabel={t('list.filter')}
          exportLabel={t('list.export')}
          newLabel={t('list.new')}
          newHref="/purchases/payment-sent/new"
          rows={tableRows}
        />
        <V2ListPager total={counts.all} page={page} />
      </div>
    </>
  );
}
