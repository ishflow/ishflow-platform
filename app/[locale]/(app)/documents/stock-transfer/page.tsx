import { V2StockTransferList } from '@/components/v2/documents-extra/stock-transfer/list';
import { V2ListPager } from '@/components/v2/shell/list-pager';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { DEFAULT_PAGE_SIZE, pageOffset, parsePage } from '@/lib/list/pagination';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getLocale, getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  number: string;
  date: Date;
  fromWarehouse: string;
  toWarehouse: string;
  units: number;
  status: string;
};

export default async function V2StockTransferListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations('v2_documents_extra.stockTransfer');
  const locale = await getLocale();
  const page = parsePage((await searchParams).page);

  let tenantId = '';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
  } catch {
    /* unauth → empty */
  }

  let rows: Row[] = [];
  let counts = { all: 0, posted: 0, saved: 0 };

  if (tenantId) {
    const result = await withTenant(tenantId, async (tx) => {
      const where = { deletedAt: null };
      const [allC, postedC, savedC, docs] = await Promise.all([
        tx.document_inventory_stock_transfer.count({ where }),
        tx.document_inventory_stock_transfer.count({ where: { ...where, status: 'POSTED' } }),
        tx.document_inventory_stock_transfer.count({ where: { ...where, status: 'SAVED' } }),
        tx.document_inventory_stock_transfer.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: pageOffset(page),
          take: DEFAULT_PAGE_SIZE,
          select: {
            id: true,
            number: true,
            status: true,
            date: true,
            sourceWarehouse: true,
            destinationWarehouse: true,
          },
        }),
      ]);
      const cnt = { all: allC, posted: postedC, saved: savedC };
      const wid = Array.from(
        new Set(docs.flatMap((d) => [d.sourceWarehouse, d.destinationWarehouse])),
      );
      const warehouses = wid.length
        ? await tx.catalog_inventory_warehouse.findMany({
            where: { id: { in: wid } },
            select: { id: true, name: true },
          })
        : [];
      const whName = new Map(warehouses.map((w) => [w.id, w.name]));

      const docIds = docs.map((d) => d.id);
      const lines = docIds.length
        ? await tx.documentLine_inventory_stock_transfer_items.findMany({
            where: { documentId: { in: docIds } },
            select: { documentId: true, quantity: true },
          })
        : [];
      const unitsByDoc = new Map<string, number>();
      for (const l of lines) {
        unitsByDoc.set(l.documentId, (unitsByDoc.get(l.documentId) ?? 0) + Number(l.quantity));
      }

      return {
        rows: docs.map((d) => ({
          id: d.id,
          number: d.number,
          date: d.date,
          fromWarehouse: whName.get(d.sourceWarehouse) ?? '—',
          toWarehouse: whName.get(d.destinationWarehouse) ?? '—',
          units: unitsByDoc.get(d.id) ?? 0,
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
        <V2StockTransferList
          columns={{
            no: t('list.col.no'),
            route: t('list.col.route'),
            date: t('list.col.date'),
            shipment: t('list.col.shipment'),
            units: t('list.col.units'),
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
          newHref="/documents/stock-transfer/new"
          rows={rows.map((r) => ({
            id: r.id,
            docNo: r.number,
            fromWarehouse: r.fromWarehouse,
            toWarehouse: r.toWarehouse,
            date: new Intl.DateTimeFormat(locale, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }).format(r.date),
            shipmentNo: r.number,
            totalUnits: r.units,
            status:
              r.status === 'POSTED'
                ? { label: t('list.status.posted'), tone: 'success' as const }
                : { label: t('list.status.saved'), tone: 'warning' as const },
            detailHref: `/documents/stock-transfer/${r.id}`,
          }))}
        />
        <V2ListPager total={counts.all} page={page} />
      </div>
    </>
  );
}
