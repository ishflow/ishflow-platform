/**
 * V2 URL-slug ⇔ engine entity-key mapping.
 *
 * Two related-but-distinct concepts share this module:
 *
 * 1. **Catalog URL slugs** — what appears in `/catalogs/<slug>/[id]`.
 *    Plural English (`warehouses`, `products`). One-to-one with engine
 *    catalog entity keys (`inventory.warehouse`, `inventory.product`).
 * 2. **`RefCombobox` entity slugs** — singular kebab-case keys the picker
 *    uses to dispatch its search action (`warehouse`, `product`,
 *    `price-type`, `sales-invoice`). NOT the same as URL slugs — the picker
 *    predates V2 routes and ships a closed `RefEntity` union.
 *
 * The generic catalog page renderer wants both: it routes by URL slug
 * (concept 1) but each form's reference fields render through `RefCombobox`
 * (concept 2). Keep them disambiguated.
 */

export type V2CatalogSlug =
  | 'warehouses'
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'price-types'
  | 'price-agreements'
  | 'product-categories'
  | 'product-groups'
  | 'cash-registers'
  | 'fixed-assets';

const CATALOG_SLUG_TO_ENTITY: Record<V2CatalogSlug, string> = {
  warehouses: 'inventory.warehouse',
  customers: 'sales.customer',
  suppliers: 'purchases.supplier',
  products: 'inventory.product',
  'price-types': 'sales.price_type',
  'price-agreements': 'sales.price_agreement',
  'product-categories': 'inventory.product_category',
  'product-groups': 'inventory.product_group',
  'cash-registers': 'treasury.cash_register',
  'fixed-assets': 'assets.fixed_asset',
};

const ENTITY_TO_CATALOG_SLUG: Record<string, V2CatalogSlug> = Object.fromEntries(
  Object.entries(CATALOG_SLUG_TO_ENTITY).map(([slug, entity]) => [entity, slug as V2CatalogSlug]),
) as Record<string, V2CatalogSlug>;

/**
 * URL slug (`warehouses`) → engine entity key (`inventory.warehouse`).
 * Returns null for unknown slugs.
 */
export function entityKeyFromCatalogSlug(slug: string): string | null {
  return CATALOG_SLUG_TO_ENTITY[slug as V2CatalogSlug] ?? null;
}

/**
 * Engine entity key (`inventory.warehouse`) → URL slug (`warehouses`).
 * Returns null when the entity has no V2 surface (e.g. registers).
 */
export function catalogSlugFromEntityKey(entityKey: string): V2CatalogSlug | null {
  return ENTITY_TO_CATALOG_SLUG[entityKey] ?? null;
}

/**
 * All known V2 catalog slugs — useful for `generateStaticParams` and tests.
 */
export const V2_CATALOG_SLUGS: V2CatalogSlug[] = Object.keys(
  CATALOG_SLUG_TO_ENTITY,
) as V2CatalogSlug[];

/**
 * Where each catalog's list page actually lives in the V2 route tree.
 *
 * Some catalogs are nested under intermediate path segments (`partners/`)
 * for variant-9 navigation grouping. Without this map, the generic catalog
 * shell would default to `/catalogs/<slug>` which 404s for customers +
 * suppliers (their real pages live under `partners/`).
 */
const CATALOG_SLUG_TO_LIST_HREF: Record<V2CatalogSlug, string> = {
  warehouses: '/catalogs/warehouses',
  customers: '/catalogs/partners/customers',
  suppliers: '/catalogs/partners/suppliers',
  products: '/catalogs/products',
  'price-types': '/catalogs/price-types',
  'price-agreements': '/catalogs/price-types/special',
  'product-categories': '/catalogs/products/categories',
  'product-groups': '/catalogs/products/groups',
  'cash-registers': '/catalogs/cash-registers',
  'fixed-assets': '/catalogs/fixed-assets',
};

/**
 * Resolve a V2 catalog slug to its actual list-page URL. Used by the
 * generic catalog shell to wire the Close / Save-then-list redirect to a
 * route that exists.
 */
export function listHrefForCatalogSlug(slug: V2CatalogSlug): string {
  return CATALOG_SLUG_TO_LIST_HREF[slug] ?? `/catalogs/${slug}`;
}

/**
 * Map from engine entity key (`inventory.warehouse`) → `RefCombobox` entity
 * (`warehouse`). Mirrors the closed `RefEntity` union in
 * `components/v2/shared/ref-combobox-actions.ts` — keys without a V2 surface
 * (registers, internal accumulation tables) get `null`.
 */
const ENTITY_TO_REF_ENTITY: Record<string, string> = {
  'inventory.warehouse': 'warehouse',
  'sales.customer': 'customer',
  'purchases.supplier': 'supplier',
  'inventory.product': 'product',
  'sales.price_type': 'price-type',
  'inventory.product_category': 'product-category',
  'inventory.product_group': 'product-group',
  'sales.invoice': 'sales-invoice',
  'purchases.invoice': 'purchase-invoice',
  'treasury.cash_register': 'cash-register',
  'treasury.bank_account': 'bank-account',
  'assets.fixed_asset': 'fixed-asset',
};

/**
 * Resolve a DSL `field.reference.to` token to a `RefCombobox` entity slug.
 * Returns null when no V2 picker surface exists for that ref target.
 */
export function refEntityFromToken(token: { module: string; name: string }): string | null {
  const entityKey = `${token.module}.${token.name}`;
  return ENTITY_TO_REF_ENTITY[entityKey] ?? null;
}

const REF_ENTITY_TO_ENGINE_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(ENTITY_TO_REF_ENTITY).map(([engineKey, refSlug]) => [refSlug, engineKey]),
);

/**
 * Reverse of `refEntityFromToken` — RefCombobox slug (`product-category`)
 * → engine entity key (`inventory.product_category`). Used by the generic
 * inline-create action so it can mint a record in the right table given a
 * picker slug.
 */
export function engineKeyFromRefEntity(refSlug: string): string | null {
  return REF_ENTITY_TO_ENGINE_KEY[refSlug] ?? null;
}
