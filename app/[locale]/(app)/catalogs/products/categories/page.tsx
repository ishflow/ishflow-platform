import { CategoryList } from '@/components/v2/catalogs/products/category-list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getLocale, getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function V2CatalogsCategoriesListPage() {
  const t = await getTranslations('v2_catalogs.products.categories.list');
  const tCommon = await getTranslations('v2_catalogs.common.list');
  const tNav = await getTranslations('v2_nav');
  const locale = await getLocale();

  let rows: { id: string; name: string; count: number; createdAt: string }[] = [];
  try {
    const ctx = await requireTenantContext();
    rows = await withTenant(ctx.tenant.id, async (tx) => {
      const [cats, products] = await Promise.all([
        tx.catalog_inventory_product_category.findMany({
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, createdAt: true },
        }),
        tx.catalog_inventory_product.findMany({
          where: { deletedAt: null },
          select: { categoryId: true },
        }),
      ]);
      const counts = new Map<string, number>();
      for (const p of products) {
        if (!p.categoryId) continue;
        counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
      }
      const fmtDate = (d: Date) =>
        new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
          d,
        );
      return cats.map((c) => ({
        id: c.id,
        name: c.name,
        count: counts.get(c.id) ?? 0,
        createdAt: fmtDate(c.createdAt),
      }));
    });
  } catch {
    rows = [];
  }

  return (
    <>
      <V2Topbar
        breadcrumb={`${tNav('catalogs.section.main')} / ${t('breadcrumbCrumb')}`}
        title={t('title')}
        subtitle={t('subtitle', { count: rows.length })}
      />
      <div className="content">
        <CategoryList
          rows={rows}
          i18n={{
            all: tCommon('all'),
            searchPlaceholder: t('searchPlaceholder'),
            searchAria: t('searchAria'),
            export: tCommon('export'),
            newCategory: t('newCategory'),
            actions: tCommon('actions'),
            col: {
              name: tCommon('col.name'),
              productCount: t('col.productCount'),
              createdAt: tCommon('col.createdAt'),
            },
            footer: (shown, total) => tCommon('footer', { shown, total }),
          }}
        />
      </div>
    </>
  );
}
