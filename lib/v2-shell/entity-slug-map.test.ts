import { describe, expect, it } from 'vitest';
import {
  V2_CATALOG_SLUGS,
  catalogSlugFromEntityKey,
  entityKeyFromCatalogSlug,
  listHrefForCatalogSlug,
  refEntityFromToken,
} from './entity-slug-map';

describe('entityKeyFromCatalogSlug', () => {
  it('maps each known slug to its dotted entity key', () => {
    expect(entityKeyFromCatalogSlug('warehouses')).toBe('inventory.warehouse');
    expect(entityKeyFromCatalogSlug('customers')).toBe('sales.customer');
    expect(entityKeyFromCatalogSlug('suppliers')).toBe('purchases.supplier');
    expect(entityKeyFromCatalogSlug('products')).toBe('inventory.product');
    expect(entityKeyFromCatalogSlug('price-types')).toBe('sales.price_type');
    expect(entityKeyFromCatalogSlug('price-agreements')).toBe('sales.price_agreement');
    expect(entityKeyFromCatalogSlug('product-categories')).toBe('inventory.product_category');
    expect(entityKeyFromCatalogSlug('product-groups')).toBe('inventory.product_group');
    expect(entityKeyFromCatalogSlug('currencies')).toBe('platform.currency');
  });

  it('returns null for unknown slugs', () => {
    expect(entityKeyFromCatalogSlug('unknown')).toBeNull();
    expect(entityKeyFromCatalogSlug('')).toBeNull();
  });
});

describe('catalogSlugFromEntityKey', () => {
  it('round-trips every known slug', () => {
    for (const slug of V2_CATALOG_SLUGS) {
      const key = entityKeyFromCatalogSlug(slug);
      expect(key).not.toBeNull();
      expect(catalogSlugFromEntityKey(key as string)).toBe(slug);
    }
  });

  it('returns null for entities with no V2 catalog surface', () => {
    expect(catalogSlugFromEntityKey('sales.invoice')).toBeNull();
    expect(catalogSlugFromEntityKey('inventory.stock_balance')).toBeNull();
    expect(catalogSlugFromEntityKey('not.real')).toBeNull();
  });
});

describe('refEntityFromToken', () => {
  it('resolves catalog ref tokens to singular RefCombobox entity slugs', () => {
    expect(refEntityFromToken({ module: 'inventory', name: 'warehouse' })).toBe('warehouse');
    expect(refEntityFromToken({ module: 'sales', name: 'customer' })).toBe('customer');
    expect(refEntityFromToken({ module: 'purchases', name: 'supplier' })).toBe('supplier');
    expect(refEntityFromToken({ module: 'inventory', name: 'product' })).toBe('product');
    expect(refEntityFromToken({ module: 'sales', name: 'price_type' })).toBe('price-type');
    expect(refEntityFromToken({ module: 'inventory', name: 'product_category' })).toBe(
      'product-category',
    );
    expect(refEntityFromToken({ module: 'inventory', name: 'product_group' })).toBe(
      'product-group',
    );
  });

  it('resolves document refs', () => {
    expect(refEntityFromToken({ module: 'sales', name: 'invoice' })).toBe('sales-invoice');
    expect(refEntityFromToken({ module: 'purchases', name: 'invoice' })).toBe('purchase-invoice');
  });

  it('returns null for unmapped tokens', () => {
    expect(refEntityFromToken({ module: 'fake', name: 'thing' })).toBeNull();
    expect(refEntityFromToken({ module: 'inventory', name: 'stock_balance' })).toBeNull();
  });
});

describe('listHrefForCatalogSlug', () => {
  it('routes product-categories under products/categories (not the products list)', () => {
    expect(listHrefForCatalogSlug('product-categories')).toBe('/catalogs/products/categories');
  });

  it('routes product-groups under products/groups (not the products list)', () => {
    expect(listHrefForCatalogSlug('product-groups')).toBe('/catalogs/products/groups');
  });

  it('routes partners under their grouped path', () => {
    expect(listHrefForCatalogSlug('customers')).toBe('/catalogs/partners/customers');
    expect(listHrefForCatalogSlug('suppliers')).toBe('/catalogs/partners/suppliers');
  });

  it('routes price-agreements to /v2/catalogs/price-types/special', () => {
    expect(listHrefForCatalogSlug('price-agreements')).toBe('/catalogs/price-types/special');
  });
});
