import {
  type PurchaseInvoiceRow,
  V2PurchaseInvoiceList,
} from '@/components/v2/documents-extra/purchase-invoice/list';
import '@/configs';

import { V2ListPager } from '@/components/v2/shell/list-pager';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { formatMoney } from '@/lib/format-money';
import { DEFAULT_PAGE_SIZE, pageOffset, parsePage } from '@/lib/list/pagination';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { resolveRowActions } from '@/platform/engine/resolve-row-actions';
import { type Locale, getRegistry } from '@/platform/metadata';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * V2 purchase-invoice list — mirrors mockup `invoice-list.html`:
 * - title "Alış Faturaları" + bilingual sub "Закупка фактуры · N belge"
 * - filter chips Tümü/Onaylı/Taslak/Reddedildi with counts
 * - cols: ☐ | No | Durum | Tarih | Поставщик / Tedarikçi | Depo | Tutar | ⋯
 * - date in "DD MMM YYYY", money via tenant currency (formatMoney)
 */
export default async function V2PurchaseInvoiceListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations('v2_documents_extra.purchaseInvoice');
  const locale = (await getLocale()) as Locale;
  const config = getRegistry().document['purchases.invoice'];
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
    warehouse: string;
    status: string;
    supplierName: string;
    warehouseName: string;
    amount: number;
  };

  let rows: Row[] = [];
  let counts = { all: 0, posted: 0, saved: 0, failed: 0 };
  if (tenantId) {
    const result = await withTenant(tenantId, async (tx) => {
      const where = { deletedAt: null };
      const [allC, postedC, savedC, failedC, invoices] = await Promise.all([
        tx.document_purchases_invoice.count({ where }),
        tx.document_purchases_invoice.count({ where: { ...where, status: 'POSTED' } }),
        tx.document_purchases_invoice.count({ where: { ...where, status: 'SAVED' } }),
        tx.document_purchases_invoice.count({ where: { ...where, status: 'FAILED' } }),
        tx.document_purchases_invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: pageOffset(page),
          take: DEFAULT_PAGE_SIZE,
          select: {
            id: true,
            number: true,
            date: true,
            supplier: true,
            warehouse: true,
            status: true,
          },
        }),
      ]);
      const cnt = { all: allC, posted: postedC, saved: savedC, failed: failedC };
      if (invoices.length === 0) return { rows: [] as Row[], counts: cnt };

      const ids = invoices.map((r) => r.id);
      const supplierIds = Array.from(new Set(invoices.map((r) => r.supplier)));
      const warehouseIds = Array.from(new Set(invoices.map((r) => r.warehouse)));

      const [suppliers, warehouses, lineSums] = await Promise.all([
        tx.catalog_purchases_supplier.findMany({
          where: { id: { in: supplierIds } },
          select: { id: true, name: true },
        }),
        tx.catalog_inventory_warehouse.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, name: true },
        }),
        tx.documentLine_purchases_invoice_items.findMany({
          where: { documentId: { in: ids } },
          select: { documentId: true, quantity: true, price: true },
        }),
      ]);

      const supMap = new Map(suppliers.map((c) => [c.id, c.name]));
      const whMap = new Map(warehouses.map((w) => [w.id, w.name]));
      const sumMap = new Map<string, number>();
      for (const l of lineSums) {
        sumMap.set(l.documentId, (sumMap.get(l.documentId) ?? 0) + Number(l.price) * l.quantity);
      }

      return {
        rows: invoices.map((inv) => ({
          ...inv,
          supplierName: supMap.get(inv.supplier) ?? inv.supplier.slice(0, 8),
          warehouseName: whMap.get(inv.warehouse) ?? '—',
          amount: sumMap.get(inv.id) ?? 0,
        })),
        counts: cnt,
      };
    });

    rows = result.rows;
    counts = result.counts;
  }

  const rowActionsById = config
    ? await resolveRowActions({
        config,
        rows: rows.map((r) => ({
          id: r.id,
          status: r.status,
          fields: { supplier: r.supplier, number: r.number },
          refLabels: { supplier: r.supplierName },
        })),
        tenantId,
        locale,
      })
    : new Map();

  // Mockup uses "16 May 2026" (day numeric, month short, year numeric).
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  const fmtMoney = (n: number) => formatMoney(n, locale, currency);

  const statusTone = (s: string): 'success' | 'warning' | 'danger' | 'neutral' =>
    s === 'POSTED' ? 'success' : s === 'FAILED' ? 'danger' : 'warning';
  const statusLabel = (s: string) =>
    s === 'POSTED'
      ? t('list.status.posted')
      : s === 'FAILED'
        ? t('list.status.failed')
        : t('list.status.saved');

  const tableRows: PurchaseInvoiceRow[] = rows.map((r) => ({
    id: r.id,
    docNo: r.number,
    date: fmtDate(r.date),
    supplierName: r.supplierName,
    warehouse: r.warehouseName,
    amount: fmtMoney(r.amount),
    status: { label: statusLabel(r.status), tone: statusTone(r.status) },
    detailHref: `/purchases/purchase-invoice/${r.id}`,
    rowActions: rowActionsById.get(r.id) ?? [],
  }));

  return (
    <>
      <V2Topbar
        breadcrumb={t('list.breadcrumb')}
        title={t('list.title')}
        subtitle={t('list.subtitle', { count: counts.all })}
      />
      <div className="content">
        <V2PurchaseInvoiceList
          columns={{
            no: t('list.col.no'),
            status: t('list.col.status'),
            date: t('list.col.date'),
            supplier: t('list.col.supplier'),
            warehouse: t('list.col.warehouse'),
            amount: t('list.col.amount'),
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
          newHref="/purchases/purchase-invoice/new"
          rows={tableRows}
        />
        <V2ListPager total={counts.all} page={page} />
      </div>
    </>
  );
}
