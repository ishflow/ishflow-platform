import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { Box, Building2, Coins, Package, Scale, Tag, Users, Wallet } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { type CatalogEntry, type CatalogNavI18n, V2CatalogNavClient } from './catalog-nav-client';

/**
 * Catalog-section side panel — appears on `/catalogs/*` list routes
 * (not record/detail routes). Mirrors the HTML mockup's left-rail
 * second column: search box + entity list with active counts.
 */
export async function V2CatalogNav() {
  const tc = await getTranslations('v2_catalogs.common');
  const tProducts = await getTranslations('v2_catalogs.products.list');
  const tPartners = await getTranslations('v2_catalogs.partners');
  const tPriceTypes = await getTranslations('v2_catalogs.priceTypes.list');
  const tCashRegisters = await getTranslations('v2_documents_extra.cashRegisters.list');

  let tenantId = '';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
  } catch {
    // Unauthenticated — render chrome with zero counts.
  }

  const counts = tenantId
    ? await withTenant(tenantId, async (tx) => {
        const [products, warehouses, suppliers, customers, special, priceTypes, cashRegisters] =
          await Promise.all([
            tx.catalog_inventory_product.count({ where: { deletedAt: null } }),
            tx.catalog_inventory_warehouse.count({ where: { deletedAt: null } }),
            tx.catalog_purchases_supplier.count({ where: { deletedAt: null } }),
            tx.catalog_sales_customer.count({ where: { deletedAt: null } }),
            tx.catalog_sales_price_agreement.count({ where: { deletedAt: null } }),
            tx.catalog_sales_price_type.count({ where: { deletedAt: null } }),
            tx.catalog_treasury_cash_register.count({ where: { deletedAt: null } }),
          ]);
        return {
          products,
          warehouses,
          suppliers,
          customers,
          special,
          priceTypes,
          cashRegisters,
        };
      })
    : {
        products: 0,
        warehouses: 0,
        suppliers: 0,
        customers: 0,
        special: 0,
        priceTypes: 0,
        cashRegisters: 0,
      };

  const entries: CatalogEntry[] = [
    {
      key: 'products',
      label: tProducts('title'),
      href: '/catalogs/products',
      count: counts.products,
      iconName: 'Box',
    },
    {
      key: 'warehouses',
      label: tc('warehousesLabel'),
      href: '/catalogs/warehouses',
      count: counts.warehouses,
      iconName: 'Building2',
    },
    {
      key: 'suppliers',
      label: tPartners('suppliers.list.title'),
      href: '/catalogs/partners/suppliers',
      count: counts.suppliers,
      iconName: 'Package',
    },
    {
      key: 'customers',
      label: tPartners('customers.list.title'),
      href: '/catalogs/partners/customers',
      count: counts.customers,
      iconName: 'Users',
    },
    {
      key: 'special',
      label: tc('specialPricesLabel'),
      // Fyaitlar listesi /price-types — özel fiyatlar (price agreements) için
      // /price-types/special var.
      href: '/catalogs/price-types/special',
      count: counts.special,
      iconName: 'Tag',
    },
    {
      key: 'priceTypes',
      label: tPriceTypes('title'),
      href: '/catalogs/price-types',
      count: counts.priceTypes,
      iconName: 'Scale',
    },
    {
      key: 'cashRegisters',
      label: tCashRegisters('title'),
      href: '/catalogs/cash-registers',
      count: counts.cashRegisters,
      iconName: 'Wallet',
    },
  ];

  const i18n: CatalogNavI18n = {
    searchPlaceholder: tc('searchInCatalogs') || 'Kataloglarda ara...',
    sectionTitle: tc('catalogsSection') || 'KATALOGLAR',
  };

  return <V2CatalogNavClient entries={entries} i18n={i18n} />;
}

// Re-export icon mapping for the client component.
export const ICONS = { Box, Building2, Coins, Package, Scale, Tag, Users, Wallet };
