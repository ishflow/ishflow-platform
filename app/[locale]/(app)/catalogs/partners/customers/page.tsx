import {
  CustomerList,
  type CustomerListRow,
} from '@/components/v2/catalogs/partners/customer-list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { Link } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';
import type { Prisma } from '@prisma/client';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function V2CatalogsPartnersCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('v2_catalogs.partners.list');
  const { q, page: pageRaw, status } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);

  const ctx = await requireTenantContext();
  const tenantId = ctx.tenant?.id ?? '';

  const statusFilter = status ?? 'active';
  const where: Prisma.Catalog_sales_customerWhereInput = {
    ...(statusFilter === 'archived'
      ? { deletedAt: { not: null } }
      : statusFilter === 'all'
        ? {}
        : { deletedAt: null }),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const { rows, total, allTotal, activeTotal, archivedTotal, priceTypeNames } = tenantId
    ? await withTenant(tenantId, async (tx) => {
        const [rowsRaw, total, allTotal, activeTotal, archivedTotal] = await Promise.all([
          tx.catalog_sales_customer.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            select: {
              id: true,
              code: true,
              name: true,
              email: true,
              phone: true,
              defaultPriceType: true,
              externalId: true,
              createdAt: true,
              deletedAt: true,
            },
          }),
          tx.catalog_sales_customer.count({ where }),
          tx.catalog_sales_customer.count({}),
          tx.catalog_sales_customer.count({ where: { deletedAt: null } }),
          tx.catalog_sales_customer.count({ where: { deletedAt: { not: null } } }),
        ]);
        const priceTypeIds = [
          ...new Set(rowsRaw.map((r) => r.defaultPriceType).filter((x): x is string => Boolean(x))),
        ];
        const priceTypes = priceTypeIds.length
          ? await tx.catalog_sales_price_type.findMany({
              where: { id: { in: priceTypeIds } },
              select: { id: true, name: true },
            })
          : [];
        const priceTypeNames = new Map(priceTypes.map((p) => [p.id, p.name]));
        return { rows: rowsRaw, total, allTotal, activeTotal, archivedTotal, priceTypeNames };
      })
    : {
        rows: [],
        total: 0,
        allTotal: 0,
        activeTotal: 0,
        archivedTotal: 0,
        priceTypeNames: new Map<string, string>(),
      };

  const listRows: CustomerListRow[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    email: r.email ?? '',
    phone: r.phone ?? '',
    priceType: r.defaultPriceType ? (priceTypeNames.get(r.defaultPriceType) ?? '') : '',
    lastSale: '—',
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
  }));

  return (
    <>
      <V2Topbar
        breadcrumb={t('breadcrumb')}
        title={t('title')}
        subtitle={t('subtitleCount', { count: total })}
      />
      <div className="content">
        <div className="seg-tabs">
          <Link href="/catalogs/partners/customers" className="is-active">
            {t('tabCustomers')}
          </Link>
          <Link href="/catalogs/partners/suppliers">{t('tabSuppliers')}</Link>
        </div>
        <CustomerList
          rows={listRows}
          total={total}
          allTotal={allTotal}
          activeTotal={activeTotal}
          archivedTotal={archivedTotal}
          search={q ?? ''}
          page={page}
          pageSize={PAGE_SIZE}
          activeStatus={statusFilter}
        />
      </div>
    </>
  );
}
