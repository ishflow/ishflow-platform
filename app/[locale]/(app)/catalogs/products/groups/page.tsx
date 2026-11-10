import { GroupList } from '@/components/v2/catalogs/products/group-list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function V2CatalogsGroupsListPage() {
  const t = await getTranslations('v2_catalogs.products.groups.list');
  const tCommon = await getTranslations('v2_catalogs.common.list');
  const tNav = await getTranslations('v2_nav');

  let rows: { id: string; name: string; count: number }[] = [];
  try {
    const ctx = await requireTenantContext();
    rows = await withTenant(ctx.tenant.id, async (tx) => {
      const [groups, products] = await Promise.all([
        tx.catalog_inventory_product_group.findMany({
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        }),
        tx.catalog_inventory_product.findMany({
          where: { deletedAt: null },
          select: { groupId: true },
        }),
      ]);
      const counts = new Map<string, number>();
      for (const p of products) {
        if (!p.groupId) continue;
        counts.set(p.groupId, (counts.get(p.groupId) ?? 0) + 1);
      }
      return groups.map((g) => ({
        id: g.id,
        name: g.name,
        count: counts.get(g.id) ?? 0,
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
        <GroupList
          rows={rows}
          i18n={{
            allHeader: t('allHeader'),
            countSuffix: (n) => t('countSuffix', { count: n }),
            searchPlaceholder: t('searchPlaceholder'),
            searchAria: t('searchAria'),
            export: tCommon('export'),
            newGroup: t('newGroup'),
            actions: tCommon('actions'),
            col: {
              name: tCommon('col.name'),
              productCount: t('col.productCount'),
            },
          }}
        />
      </div>
    </>
  );
}
