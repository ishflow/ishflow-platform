/**
 * Map a V2 pathname to a tab-label i18n key.
 *
 * Returns `{ key, ns }` so the tab component can call
 * `useTranslations(ns)(key)` — V2 keeps tab labels in catalog-aware
 * namespaces (`v2_catalogs.*`) rather than the flat rail-level
 * `v2_nav.rail.*` map, so a tab on `/catalogs/partners/suppliers/new`
 * reads "Yeni Tedarikçi" instead of just "Kataloglar".
 *
 * Falls back to the rail label when the pathname doesn't match any
 * specific page (e.g. `/dashboard` → `v2_nav.rail.dashboard`).
 */
export type TabLabelKey = { ns: string; key: string };

const LOCALES = new Set(['ru', 'en', 'tr', 'uz', 'ky', 'de', 'fr', 'zh']);
const UUID_RE = /^[0-9a-f-]{36}$/i;

function strip(pathname: string): string[] {
  const parts = pathname.split('/').filter(Boolean);
  let i = 0;
  const first = parts[i];
  if (first && LOCALES.has(first)) i++;
  if (parts[i] === 'v2') i++;
  return parts.slice(i);
}

export function tabLabelFromPath(pathname: string): TabLabelKey {
  const seg = strip(pathname);

  // /catalogs/...
  if (seg[0] === 'catalogs') {
    // /catalogs (hub)
    if (seg.length === 1) return { ns: 'v2_catalogs.common', key: 'catalogsSection' };

    // /catalogs/products/...
    if (seg[1] === 'products') {
      // /catalogs/products
      if (seg.length === 2) return { ns: 'v2_catalogs.products.list', key: 'title' };
      // /catalogs/products/new
      if (seg[2] === 'new') return { ns: 'v2_nav.tabs', key: 'newProduct' };
      // /catalogs/products/categories/...
      if (seg[2] === 'categories') {
        if (seg.length === 3) return { ns: 'v2_catalogs.products.categories.list', key: 'title' };
        if (seg[3] === 'new') return { ns: 'v2_nav.tabs', key: 'newCategory' };
        if (UUID_RE.test(seg[3] ?? '')) return { ns: 'v2_nav.tabs', key: 'editCategory' };
      }
      // /catalogs/products/groups/...
      if (seg[2] === 'groups') {
        if (seg.length === 3) return { ns: 'v2_catalogs.products.groups.list', key: 'title' };
        if (seg[3] === 'new') return { ns: 'v2_nav.tabs', key: 'newGroup' };
        if (UUID_RE.test(seg[3] ?? '')) return { ns: 'v2_nav.tabs', key: 'editGroup' };
      }
      // /catalogs/products/<uuid>
      if (UUID_RE.test(seg[2] ?? '')) return { ns: 'v2_nav.tabs', key: 'editProduct' };
    }

    // /catalogs/partners/...
    if (seg[1] === 'partners') {
      if (seg[2] === 'customers') {
        if (seg.length === 3) return { ns: 'v2_catalogs.partners.customers.list', key: 'title' };
        if (seg[3] === 'new') return { ns: 'v2_nav.tabs', key: 'newCustomer' };
        if (UUID_RE.test(seg[3] ?? '')) return { ns: 'v2_nav.tabs', key: 'editCustomer' };
      }
      if (seg[2] === 'suppliers') {
        if (seg.length === 3) return { ns: 'v2_catalogs.partners.suppliers.list', key: 'title' };
        if (seg[3] === 'new') return { ns: 'v2_nav.tabs', key: 'newSupplier' };
        if (UUID_RE.test(seg[3] ?? '')) return { ns: 'v2_nav.tabs', key: 'editSupplier' };
      }
    }

    // /catalogs/price-types/...
    if (seg[1] === 'price-types') {
      if (seg.length === 2) return { ns: 'v2_catalogs.priceTypes.list', key: 'title' };
      if (seg[2] === 'new') return { ns: 'v2_nav.tabs', key: 'newPriceType' };
      if (seg[2] === 'special') {
        if (seg.length === 3) return { ns: 'v2_catalogs.priceTypes.special.list', key: 'title' };
        if (seg[3] === 'new') return { ns: 'v2_nav.tabs', key: 'newSpecialPrice' };
        if (UUID_RE.test(seg[3] ?? '')) return { ns: 'v2_nav.tabs', key: 'editSpecialPrice' };
      }
      if (UUID_RE.test(seg[2] ?? '')) return { ns: 'v2_nav.tabs', key: 'editPriceType' };
    }

    // Unknown /catalogs/* — fall back to the rail label.
    return { ns: 'v2_nav.rail', key: 'catalogs' };
  }

  // Other rails — use the rail label as fallback.
  return { ns: 'v2_nav.rail', key: seg[0] ?? 'dashboard' };
}
