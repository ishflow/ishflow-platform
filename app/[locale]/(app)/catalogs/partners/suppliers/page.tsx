import {
  SupplierList,
  type SupplierListRow,
} from '@/components/v2/catalogs/partners/supplier-list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { Link } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';
import type { Prisma } from '@prisma/client';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function V2CatalogsPartnersSuppliersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tList = await getTranslations('v2_catalogs.partners.list');
  const tSup = await getTranslations('v2_catalogs.partners.suppliers.list');
  const { q, page: pageRaw, status } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);
  const ctx = await requireTenantContext();
  const tenantId = ctx.tenant?.id ?? '';

  const statusFilter = status ?? 'active';
  const where: Prisma.Catalog_purchases_supplierWhereInput = {
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

  const { rows, total, allTotal, activeTotal, archivedTotal } = tenantId
    ? await withTenant(tenantId, async (tx) => {
        const [rowsRaw, total, allTotal, activeTotal, archivedTotal] = await Promise.all([
          tx.catalog_purchases_supplier.findMany({
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
              createdAt: true,
              deletedAt: true,
            },
          }),
          tx.catalog_purchases_supplier.count({ where }),
          tx.catalog_purchases_supplier.count({}),
          tx.catalog_purchases_supplier.count({ where: { deletedAt: null } }),
          tx.catalog_purchases_supplier.count({ where: { deletedAt: { not: null } } }),
        ]);
        return { rows: rowsRaw, total, allTotal, activeTotal, archivedTotal };
      })
    : { rows: [], total: 0, allTotal: 0, activeTotal: 0, archivedTotal: 0 };

  const listRows: SupplierListRow[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    email: r.email ?? '',
    phone: r.phone ?? '',
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
  }));

  return (
    <>
      <V2Topbar
        breadcrumb={tSup('breadcrumb')}
        title={tSup('title')}
        subtitle={tList('subtitleCount', { count: total })}
      />
      <div className="content">
        <div className="seg-tabs">
          <Link href="/catalogs/partners/customers">{tList('tabCustomers')}</Link>
          <Link href="/catalogs/partners/suppliers" className="is-active">
            {tList('tabSuppliers')}
          </Link>
        </div>
        <SupplierList
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
