import { V2ReturnInvoiceList } from '@/components/v2/documents-extra/return-invoice/list';
import { V2ListPager } from '@/components/v2/shell/list-pager';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { formatMoney } from '@/lib/format-money';
import { DEFAULT_PAGE_SIZE, pageOffset, parsePage } from '@/lib/list/pagination';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getLocale, getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  number: string;
  originalNumber: string;
  customer: string;
  date: Date;
  amount: number;
  status: string;
};

export default async function V2ReturnInvoiceListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations('v2_documents_extra.returnInvoice');
  const locale = await getLocale();
  const page = parsePage((await searchParams).page);

  let tenantId = '';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
  } catch {
    /* unauthenticated → empty list */
  }

  let rows: Row[] = [];
  let counts = { all: 0, posted: 0, saved: 0 };

  if (tenantId) {
    const result = await withTenant(tenantId, async (tx) => {
      const where = { deletedAt: null };
      const [allC, postedC, savedC, docs] = await Promise.all([
        tx.document_sales_return_invoice.count({ where }),
        tx.document_sales_return_invoice.count({ where: { ...where, status: 'POSTED' } }),
        tx.document_sales_return_invoice.count({ where: { ...where, status: 'SAVED' } }),
        tx.document_sales_return_invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: pageOffset(page),
          take: DEFAULT_PAGE_SIZE,
          select: {
            id: true,
            number: true,
            status: true,
            date: true,
            customer: true,
            originalInvoice: true,
          },
        }),
      ]);
      const cnt = { all: allC, posted: postedC, saved: savedC };
      const customerIds = Array.from(new Set(docs.map((d) => d.customer)));
      const customers = customerIds.length
        ? await tx.catalog_sales_customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true },
          })
        : [];
      const customerName = new Map(customers.map((c) => [c.id, c.name]));

      const origIds = Array.from(
        new Set(docs.map((d) => d.originalInvoice).filter((v): v is string => !!v)),
      );
      const origs = origIds.length
        ? await tx.document_sales_invoice.findMany({
            where: { id: { in: origIds } },
            select: { id: true, number: true },
          })
        : [];
      const origNumber = new Map(origs.map((o) => [o.id, o.number]));

      const docIds = docs.map((d) => d.id);
      const lines = docIds.length
        ? await tx.documentLine_sales_return_invoice_items.findMany({
            where: { documentId: { in: docIds } },
            select: { documentId: true, quantity: true, price: true },
          })
        : [];
      const sumByDoc = new Map<string, number>();
      for (const l of lines) {
        const cur = sumByDoc.get(l.documentId) ?? 0;
        sumByDoc.set(l.documentId, cur + Number(l.quantity) * Number(l.price));
      }
      return {
        rows: docs.map((d) => ({
          id: d.id,
          number: d.number,
          originalNumber: d.originalInvoice ? (origNumber.get(d.originalInvoice) ?? '—') : '—',
          customer: customerName.get(d.customer) ?? '—',
          date: d.date,
          amount: sumByDoc.get(d.id) ?? 0,
          status: d.status,
        })),
        counts: cnt,
      };
    });

    rows = result.rows;
    counts = result.counts;
  }

  return (
    <>
      <V2Topbar
        breadcrumb={t('list.breadcrumb')}
        title={t('list.title')}
        subtitle={t('list.subtitle', { count: counts.all })}
      />
      <div className="content">
        <V2ReturnInvoiceList
          columns={{
            no: t('list.col.no'),
            original: t('list.col.original'),
            customer: t('list.col.customer'),
            date: t('list.col.date'),
            amount: t('list.col.amount'),
            status: t('list.col.status'),
          }}
          statuses={[
            { key: 'all', label: t('list.status.all'), count: counts.all },
            { key: 'success', label: t('list.status.posted'), count: counts.posted },
            { key: 'warning', label: t('list.status.saved'), count: counts.saved },
          ]}
          searchPlaceholder={t('list.search')}
          filterLabel={t('list.filter')}
          exportLabel={t('list.export')}
          newLabel={t('list.new')}
          newHref="/documents/return-invoice/new"
          rows={rows.map((r) => ({
            id: r.id,
            docNo: r.number,
            originalDocNo: r.originalNumber,
            customer: r.customer,
            date: new Intl.DateTimeFormat(locale, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }).format(r.date),
            amount: formatMoney(r.amount, locale),
            status:
              r.status === 'POSTED'
                ? { label: t('list.status.posted'), tone: 'success' }
                : { label: t('list.status.saved'), tone: 'warning' },
            detailHref: `/documents/return-invoice/${r.id}`,
          }))}
        />
        <V2ListPager total={counts.all} page={page} />
      </div>
    </>
  );
}
