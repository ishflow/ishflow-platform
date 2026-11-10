import {
  PriceTypeList,
  type PriceTypeListRow,
} from '@/components/v2/catalogs/price-types/price-type-list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import type { Locale } from '@/platform/metadata';
import type { Prisma } from '@prisma/client';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function V2CatalogsPriceTypesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('v2_catalogs.priceTypes.list');
  const { q, page: pageRaw, status } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);
  const ctx = await requireTenantContext();
  const tenantId = ctx.tenant?.id ?? '';

  const statusFilter = status ?? 'active';
  const where: Prisma.Catalog_sales_price_typeWhereInput = {
    ...(statusFilter === 'archived'
      ? { deletedAt: { not: null } }
      : statusFilter === 'all'
        ? {}
        : { deletedAt: null }),
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
  };

  const { rows, total, allTotal, activeTotal, archivedTotal, allTypes } = tenantId
    ? await withTenant(tenantId, async (tx) => {
        const [rowsRaw, total, allTotal, activeTotal, archivedTotal, allTypesRaw] =
          await Promise.all([
            tx.catalog_sales_price_type.findMany({
              where,
              orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
              skip: (page - 1) * PAGE_SIZE,
              take: PAGE_SIZE,
              select: {
                id: true,
                name: true,
                kind: true,
                description: true,
                basePriceType: true,
                markupPct: true,
                isDefault: true,
                deletedAt: true,
              },
            }),
            tx.catalog_sales_price_type.count({ where }),
            tx.catalog_sales_price_type.count({}),
            tx.catalog_sales_price_type.count({ where: { deletedAt: null } }),
            tx.catalog_sales_price_type.count({ where: { deletedAt: { not: null } } }),
            tx.catalog_sales_price_type.findMany({
              where: { deletedAt: null },
              select: { id: true, name: true },
            }),
          ]);
        return {
          rows: rowsRaw,
          total,
          allTotal,
          activeTotal,
          archivedTotal,
          allTypes: allTypesRaw,
        };
      })
    : {
        rows: [],
        total: 0,
        allTotal: 0,
        activeTotal: 0,
        archivedTotal: 0,
        allTypes: [] as Array<{ id: string; name: string }>,
      };

  const labelById = new Map(allTypes.map((r) => [r.id, r.name]));
  const listRows: PriceTypeListRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    symbol: r.kind === 'static' ? 'STA' : 'DYN',
    description: r.description ?? '',
    baseName: r.basePriceType ? (labelById.get(r.basePriceType) ?? '—') : null,
    markupPct: r.markupPct ? Number(r.markupPct) : null,
    isDefault: !!r.isDefault,
    isArchived: !!r.deletedAt,
  }));

  return (
    <>
      <V2Topbar
        breadcrumb={t('breadcrumb')}
        title={t('title')}
        subtitle={t('subtitleCount', { count: total })}
      />
      <div className="content">
        <PriceTypeList
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
