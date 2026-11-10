import '@/configs';

import { V2InvoiceList } from '@/components/v2/documents/invoice-list';
import type { InvoiceRowProps } from '@/components/v2/documents/invoice-row';
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
 * V2 sales-invoice list — mirrors mockup `satis-faturalari.html`:
 * - title "Satış Faturaları" + bilingual sub "Реализация · N belge"
 * - filter chips Tümü/Onaylı/Taslak/Reddedildi
 * - cols: ☐ | No | Durum | Tarih | Покупатель / Müşteri | Depo | Fiyat türü | Tutar | ⋯
 * - date in "DD MMM YYYY" locale-aware, money via tenant currency (formatMoney)
 */
export default async function V2SalesInvoiceListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations('v2_documents');
  const locale = (await getLocale()) as Locale;
  const config = getRegistry().document['sales.invoice'];
  const page = parsePage((await searchParams).page);

  let tenantId = '';
  let currency = 'USD';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
    currency = ctx.tenant?.currency ?? 'USD';
  } catch {
    // Unauthenticated — render empty list.
  }

  type Row = {
    id: string;
    number: string;
    date: Date;
    customer: string;
    warehouse: string;
    priceType: string | null;
    status: string;
    customerName: string;
    warehouseName: string;
    priceTypeName: string;
    amount: number;
  };

  let rows: Row[] = [];
  let counts = { all: 0, posted: 0, saved: 0, failed: 0 };
  if (tenantId) {
    const result = await withTenant(tenantId, async (tx) => {
      const where = { deletedAt: null };
      const [allC, postedC, savedC, failedC, invoices] = await Promise.all([
        tx.document_sales_invoice.count({ where }),
        tx.document_sales_invoice.count({ where: { ...where, status: 'POSTED' } }),
        tx.document_sales_invoice.count({ where: { ...where, status: 'SAVED' } }),
        tx.document_sales_invoice.count({ where: { ...where, status: 'FAILED' } }),
        tx.document_sales_invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: pageOffset(page),
          take: DEFAULT_PAGE_SIZE,
          select: {
            id: true,
            number: true,
            date: true,
            customer: true,
            warehouse: true,
            priceType: true,
            status: true,
          },
        }),
      ]);
      const cnt = { all: allC, posted: postedC, saved: savedC, failed: failedC };
      if (invoices.length === 0) return { rows: [] as Row[], counts: cnt };

      const ids = invoices.map((r) => r.id);
      const customerIds = Array.from(new Set(invoices.map((r) => r.customer)));
      const warehouseIds = Array.from(new Set(invoices.map((r) => r.warehouse)));
      const priceTypeIds = Array.from(
        new Set(invoices.map((r) => r.priceType).filter((v): v is string => Boolean(v))),
      );

      const [customers, warehouses, priceTypes, lineSums] = await Promise.all([
        tx.catalog_sales_customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        }),
        tx.catalog_inventory_warehouse.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, name: true },
        }),
        priceTypeIds.length
          ? tx.catalog_sales_price_type.findMany({
              where: { id: { in: priceTypeIds } },
              select: { id: true, name: true },
            })
          : Promise.resolve([] as Array<{ id: string; name: string }>),
        tx.documentLine_sales_invoice_items.findMany({
          where: { documentId: { in: ids } },
          select: { documentId: true, quantity: true, price: true },
        }),
      ]);

      const custMap = new Map(customers.map((c) => [c.id, c.name]));
      const whMap = new Map(warehouses.map((w) => [w.id, w.name]));
      const ptMap = new Map(priceTypes.map((p) => [p.id, p.name]));
      const sumMap = new Map<string, number>();
      for (const l of lineSums) {
        sumMap.set(l.documentId, (sumMap.get(l.documentId) ?? 0) + Number(l.price) * l.quantity);
      }

      return {
        rows: invoices.map((inv) => ({
          ...inv,
          customerName: custMap.get(inv.customer) ?? inv.customer.slice(0, 8),
          warehouseName: whMap.get(inv.warehouse) ?? '—',
          priceTypeName: inv.priceType ? (ptMap.get(inv.priceType) ?? '—') : '—',
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
          fields: { customer: r.customer, number: r.number },
          refLabels: { customer: r.customerName },
        })),
        tenantId,
        locale,
      })
    : new Map();

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

  const invoices: InvoiceRowProps[] = rows.map((r) => ({
    id: r.id,
    docNo: r.number,
    date: fmtDate(r.date),
    partnerName: r.customerName,
    warehouse: r.warehouseName,
    priceType: r.priceTypeName,
    amount: fmtMoney(r.amount),
    status: { label: statusLabel(r.status), tone: statusTone(r.status) },
    detailHref: `/documents/sales-invoice/${r.id}`,
    rowActions: rowActionsById.get(r.id) ?? [],
  }));

  return (
    <>
      <V2Topbar
        breadcrumb={t('list.breadcrumbShort')}
        title={t('list.title')}
        subtitle={t('list.subtitle', { count: counts.all })}
      />
      <div className="content">
        <V2InvoiceList
          columns={{
            no: t('list.col.no'),
            status: t('list.col.status'),
            date: t('list.col.date'),
            partner: t('list.col.partner'),
            warehouse: t('list.col.warehouse'),
            priceType: t('list.col.priceType'),
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
          newLabel={t('list.newInvoice')}
          newHref="/documents/sales-invoice/new"
          invoices={invoices}
        />
        <V2ListPager total={counts.all} page={page} />
      </div>
    </>
  );
}
