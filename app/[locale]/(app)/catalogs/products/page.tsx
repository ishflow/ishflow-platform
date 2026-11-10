import { ProductList, type ProductListRow } from '@/components/v2/catalogs/products/product-list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import type { Locale } from '@/platform/metadata';
import type { Prisma } from '@prisma/client';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

type CategoryNode = {
  id: string;
  label: string;
  count: number;
};

export default async function V2CatalogsProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    cat?: string;
    group?: string;
    status?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('v2_catalogs.products.list');
  const { q, page: pageRaw, cat, group, status, sort, dir } = await searchParams;
  const ctx = await requireTenantContext();
  const tenantId = ctx.tenant?.id ?? '';

  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);

  // Column sort (QA #76). Only `sku`/`name` are user-sortable; default = newest.
  const sortField = sort === 'name' ? 'name' : sort === 'sku' ? 'code' : 'createdAt';
  const sortDir: 'asc' | 'desc' = dir === 'asc' ? 'asc' : 'desc';
  const orderBy = {
    [sortField]: sortDir,
  } as Prisma.Catalog_inventory_productOrderByWithRelationInput;

  const where: Prisma.Catalog_inventory_productWhereInput = {
    ...(status === 'archived' ? { deletedAt: { not: null } } : { deletedAt: null }),
    ...(cat ? { categoryId: cat } : {}),
    ...(group ? { groupId: group } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { code: { contains: q, mode: 'insensitive' as const } },
            { barcode: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const { rows, total, allActiveTotal, archivedTotal, categories, groups } = tenantId
    ? await withTenant(tenantId, async (tx) => {
        const [rowsRaw, total, allActiveTotal, archivedTotal, categoriesRaw, groupsRaw] =
          await Promise.all([
            tx.catalog_inventory_product.findMany({
              where,
              orderBy,
              skip: (page - 1) * PAGE_SIZE,
              take: PAGE_SIZE,
              select: {
                id: true,
                code: true,
                name: true,
                categoryId: true,
                groupId: true,
                barcode: true,
                unit: true,
                costPrice: true,
                listPrice: true,
                deletedAt: true,
              },
            }),
            tx.catalog_inventory_product.count({ where }),
            tx.catalog_inventory_product.count({ where: { deletedAt: null } }),
            tx.catalog_inventory_product.count({ where: { deletedAt: { not: null } } }),
            tx.catalog_inventory_product_category.findMany({
              where: { deletedAt: null },
              orderBy: { name: 'asc' },
              select: { id: true, name: true },
            }),
            tx.catalog_inventory_product_group.findMany({
              where: { deletedAt: null },
              orderBy: { name: 'asc' },
              select: { id: true, name: true },
            }),
          ]);

        const catCounts = await tx.catalog_inventory_product.groupBy({
          by: ['categoryId'],
          where: { deletedAt: null },
          _count: { _all: true },
        });
        const catCountMap = new Map<string, number>();
        for (const r of catCounts) {
          if (r.categoryId) catCountMap.set(r.categoryId, r._count._all);
        }

        const groupCounts = await tx.catalog_inventory_product.groupBy({
          by: ['groupId'],
          where: { deletedAt: null },
          _count: { _all: true },
        });
        const groupCountMap = new Map<string, number>();
        for (const r of groupCounts) {
          if (r.groupId) groupCountMap.set(r.groupId, r._count._all);
        }

        const categories: CategoryNode[] = categoriesRaw.map((c) => ({
          id: c.id,
          label: c.name,
          count: catCountMap.get(c.id) ?? 0,
        }));
        const groups: CategoryNode[] = groupsRaw.map((g) => ({
          id: g.id,
          label: g.name,
          count: groupCountMap.get(g.id) ?? 0,
        }));

        return {
          rows: rowsRaw as Array<{
            id: string;
            code: string;
            name: string;
            categoryId: string | null;
            groupId: string | null;
            barcode: string | null;
            unit: string | null;
            costPrice: unknown;
            listPrice: unknown;
            deletedAt: Date | null;
          }>,
          total,
          allActiveTotal,
          archivedTotal,
          categories,
          groups,
        };
      })
    : {
        rows: [],
        total: 0,
        allActiveTotal: 0,
        archivedTotal: 0,
        categories: [] as CategoryNode[],
        groups: [] as CategoryNode[],
      };

  const categoryLabelById = new Map(categories.map((c) => [c.id, c.label]));
  const groupLabelById = new Map(groups.map((g) => [g.id, g.label]));
  const listRows: ProductListRow[] = rows.map((r) => ({
    id: r.id,
    sku: r.code,
    name: r.name,
    category: r.categoryId ? (categoryLabelById.get(r.categoryId) ?? '—') : '—',
    group: r.groupId ? (groupLabelById.get(r.groupId) ?? '—') : '—',
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
        <ProductList
          rows={listRows}
          total={total}
          allActiveTotal={allActiveTotal}
          archivedTotal={archivedTotal}
          categories={categories}
          groups={groups}
          activeCategory={cat ?? null}
          activeGroup={group ?? null}
          activeStatus={status ?? null}
          activeSort={sort ?? null}
          activeDir={sortDir}
          search={q ?? ''}
          page={page}
          pageSize={PAGE_SIZE}
        />
      </div>
    </>
  );
}
