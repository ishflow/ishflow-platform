import { V2WarehouseList } from '@/components/v2/documents-extra/warehouses/list';
import type { WarehouseRow } from '@/components/v2/documents-extra/warehouses/list';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { formatMoney } from '@/lib/format-money';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function V2WarehouseListPage() {
  const t = await getTranslations('v2_documents_extra.warehouses');
  const locale = await getLocale();

  let tenantId = '';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
  } catch {
    // Unauthenticated — render chrome with zero counts.
  }

  let rows: WarehouseRow[] = [];
  if (tenantId) {
    rows = await withTenant(tenantId, async (tx) => {
      const warehouses = await tx.catalog_inventory_warehouse.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
        },
      });
      if (warehouses.length === 0) return [];

      // Count active SKUs that have stock in each warehouse via the stock-on-hand
      // register. Stock value (sum of qty*cost) needs the cost register and is
      // expensive to compute per warehouse here — leave as 0 until a dedicated
      // helper lands.
      const skuCounts = await Promise.all(
        warehouses.map((w) =>
          tx.movement_inventory_stock_balance
            .groupBy({
              by: ['product'],
              where: { warehouse: w.id, active: true },
              _sum: { quantity: true },
            })
            .then(
              (groups: Array<{ _sum: { quantity: unknown } }>) =>
                groups.filter((g) => Number(g._sum.quantity ?? 0) > 0).length,
            )
            .catch(() => 0),
        ),
      );

      return warehouses.map(
        (w, i): WarehouseRow => ({
          id: w.id,
          code: w.code,
          name: w.name,
          address: w.address ?? '—',
          activeSku: skuCounts[i] ?? 0,
          stockValue: formatMoney(0, locale, 'USD'),
          status: { label: t('list.status.active'), tone: 'success' },
          detailHref: `/catalogs/warehouses/${w.id}`,
        }),
      );
    });
  }

  const total = rows.length;
  const activeCount = rows.filter((r) => r.status.tone === 'success').length;
  const archivedCount = rows.filter((r) => r.status.tone === 'neutral').length;

  return (
    <>
      <V2Topbar
        breadcrumb={t('list.breadcrumb')}
        title={t('list.title')}
        subtitle={t('list.subtitle', { count: total })}
      />
      <div className="content">
        <V2WarehouseList
          columns={{
            code: t('list.col.code'),
            name: t('list.col.name'),
            address: t('list.col.address'),
            activeSku: t('list.col.activeSku'),
            stockValue: t('list.col.stockValue'),
            status: t('list.col.status'),
          }}
          statuses={[
            { key: 'all', label: t('list.status.all'), count: total },
            { key: 'success', label: t('list.status.active'), count: activeCount },
            { key: 'neutral', label: t('list.status.archived'), count: archivedCount },
          ]}
          searchPlaceholder={t('list.search')}
          filterLabel={t('list.filter')}
          exportLabel={t('list.export')}
          newLabel={t('list.new')}
          newHref="/catalogs/warehouses/new"
          rows={rows}
        />
      </div>
    </>
  );
}
