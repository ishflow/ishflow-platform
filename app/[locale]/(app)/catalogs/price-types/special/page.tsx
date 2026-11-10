import {
  SpecialPriceList,
  type SpecialPriceRow,
} from '@/components/v2/catalogs/price-types/special-price-list';
import { V2ListPager } from '@/components/v2/shell/list-pager';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { formatMoney } from '@/lib/format-money';
import { DEFAULT_PAGE_SIZE, pageOffset, parsePage } from '@/lib/list/pagination';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function V2CatalogsSpecialPricesListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations('v2_catalogs.specialPrices.list');
  const locale = await getLocale();
  const page = parsePage((await searchParams).page);

  let tenantId = '';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
  } catch {
    // Unauthenticated — render empty list.
  }

  let rows: SpecialPriceRow[] = [];
  let total = 0;
  if (tenantId) {
    const result = await withTenant(tenantId, async (tx) => {
      const where = { deletedAt: null };
      const [count, agreements] = await Promise.all([
        tx.catalog_sales_price_agreement.count({ where }),
        tx.catalog_sales_price_agreement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: pageOffset(page),
          take: DEFAULT_PAGE_SIZE,
          select: {
            id: true,
            counterparty: true,
            product: true,
            fixedPrice: true,
            validFrom: true,
            validTo: true,
          },
        }),
      ]);
      if (agreements.length === 0) return { rows: [] as SpecialPriceRow[], total: count };

      const customerIds = Array.from(new Set(agreements.map((a) => a.counterparty)));
      const productIds = Array.from(new Set(agreements.map((a) => a.product)));
      const [customers, products] = await Promise.all([
        tx.catalog_sales_customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true, externalId: true },
        }),
        tx.catalog_inventory_product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, code: true, listPrice: true },
        }),
      ]);
      const custMap = new Map(customers.map((c) => [c.id, c]));
      const prodMap = new Map(products.map((p) => [p.id, p]));

      const fmtDate = (d: Date) =>
        new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(d);

      const now = new Date();
      return {
        rows: agreements.map((a): SpecialPriceRow => {
          const cust = custMap.get(a.counterparty);
          const prod = prodMap.get(a.product);
          const fixed = Number(a.fixedPrice);
          const list = prod?.listPrice ? Number(prod.listPrice) : null;
          const discount =
            list && list > 0 ? `−${(((list - fixed) / list) * 100).toFixed(1)}%` : null;
          const expired = a.validTo ? a.validTo.getTime() < now.getTime() : false;
          const validity = a.validTo
            ? `${fmtDate(a.validFrom)} — ${fmtDate(a.validTo)}`
            : fmtDate(a.validFrom);
          return {
            id: a.id,
            customer: {
              name: cust?.name ?? a.counterparty.slice(0, 8),
              code: cust?.externalId ?? a.counterparty.slice(0, 8).toUpperCase(),
            },
            product: {
              name: prod?.name ?? a.product.slice(0, 8),
              sku: prod?.code ?? '—',
            },
            unitPrice: formatMoney(fixed, locale, 'USD'),
            discount,
            validity,
            expired,
          };
        }),
        total: count,
      };
    });
    rows = result.rows;
    total = result.total;
  }

  return (
    <>
      <V2Topbar
        breadcrumb={t('breadcrumb')}
        title={t('title')}
        subtitle={t('subtitleCount', { count: total })}
      />
      <div className="content">
        <SpecialPriceList rows={rows} />
        <V2ListPager total={total} page={page} />
      </div>
    </>
  );
}
