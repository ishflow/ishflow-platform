import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';
import { type RecordListPanelData, V2RecordListPanelClient } from './record-list-panel-client';

/**
 * Contextual side panel for record routes inside `/catalogs/*`.
 *
 * Eagerly fetches 12 most-recent rows from 7 entity tables (product,
 * category, group, customer, supplier, price-type, special-price) and
 * passes them all to `V2RecordListPanelClient`, which picks the active
 * variant from `usePathname()`. All queries are tenant-scoped via
 * `withTenant`.
 *
 * Why fetch all 7 every time: server-side `headers().get('x-pathname')`
 * was empty in Next.js 16 + turbopack dev, so the panel can't know which
 * mode the route is in until the client takes over. 7 indexed 12-row
 * scans per navigation is negligible (`<10ms` total in dev).
 */
export async function V2RecordListPanel() {
  const t = await getTranslations('v2_catalogs.products.list');
  const tCat = await getTranslations('v2_catalogs.products.categories.list');
  const tGrp = await getTranslations('v2_catalogs.products.groups.list');
  const tPartners = await getTranslations('v2_catalogs.partners');
  const tPriceTypes = await getTranslations('v2_catalogs.priceTypes.list');
  const tSpecial = await getTranslations('v2_catalogs.priceTypes.special.list');

  let tenantId = '';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
  } catch {
    // Unauthenticated — chrome with empty lists.
  }

  const i18n: RecordListPanelData['i18n'] = {
    backToCatalogs: t('backToCatalogs'),
    searchPlaceholder: t('searchPlaceholder'),
    draft: t('draft'),
    titles: {
      products: t('allRecords'),
      categories: tCat('title'),
      groups: tGrp('title'),
      customers: tPartners('customers.list.title'),
      suppliers: tPartners('suppliers.list.title'),
      priceTypes: tPriceTypes('title'),
      specialPrices: tSpecial('title'),
    },
  };

  if (!tenantId) {
    return (
      <V2RecordListPanelClient
        data={{
          products: [],
          categories: [],
          groups: [],
          customers: [],
          suppliers: [],
          priceTypes: [],
          specialPrices: [],
          i18n,
        }}
      />
    );
  }

  const data = await withTenant(tenantId, async (tx) => {
    const [products, categories, groups, customers, suppliers, priceTypes, specialPrices] =
      await Promise.all([
        tx.catalog_inventory_product.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, code: true, name: true },
        }),
        tx.catalog_inventory_product_category.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, name: true },
        }),
        tx.catalog_inventory_product_group.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, name: true },
        }),
        tx.catalog_sales_customer.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, name: true, externalId: true },
        }),
        tx.catalog_purchases_supplier.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, name: true },
        }),
        tx.catalog_sales_price_type.findMany({
          where: { deletedAt: null },
          orderBy: { isDefault: 'desc' },
          take: 12,
          select: { id: true, name: true, kind: true },
        }),
        tx.catalog_sales_price_agreement.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, fixedPrice: true, validFrom: true },
        }),
      ]);
    return {
      products: products.map((p) => ({ id: p.id, code: p.code, name: p.name })),
      categories: categories.map((c) => ({ id: c.id, code: '', name: c.name })),
      groups: groups.map((g) => ({ id: g.id, code: '', name: g.name })),
      customers: customers.map((c) => ({
        id: c.id,
        code: c.externalId ?? c.id.slice(0, 8).toUpperCase(),
        name: c.name,
      })),
      suppliers: suppliers.map((s) => ({
        id: s.id,
        code: s.id.slice(0, 8).toUpperCase(),
        name: s.name,
      })),
      priceTypes: priceTypes.map((p) => ({
        id: p.id,
        code: p.kind === 'static' ? 'STA' : 'DYN',
        name: p.name,
      })),
      // Special prices are price-agreement rows (counterparty × product fixed
      // price); display as "validFrom · $price" since there's no human-readable
      // name field on the agreement.
      specialPrices: specialPrices.map((s) => ({
        id: s.id,
        code: s.validFrom.toISOString().slice(0, 10),
        name: `$${Number(s.fixedPrice).toFixed(2)}`,
      })),
      i18n,
    } satisfies RecordListPanelData;
  });

  return <V2RecordListPanelClient data={data} />;
}
