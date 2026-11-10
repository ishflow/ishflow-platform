'use client';

import { Link, usePathname } from '@/platform/i18n/navigation';
import {
  ChevronLeft,
  Circle,
  Folder,
  Layers,
  Package,
  Scale,
  Search,
  Tag,
  Truck,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';

type Row = { id: string; code: string; name: string };

export type RecordMode =
  | 'products'
  | 'categories'
  | 'groups'
  | 'customers'
  | 'suppliers'
  | 'priceTypes'
  | 'specialPrices';

export type RecordListPanelData = {
  products: Row[];
  categories: Row[];
  groups: Row[];
  customers: Row[];
  suppliers: Row[];
  priceTypes: Row[];
  specialPrices: Row[];
  i18n: {
    backToCatalogs: string;
    searchPlaceholder: string;
    draft: string;
    titles: Record<RecordMode, string>;
  };
};

type ModeConfig = {
  routePrefix: string;
  newSuffix: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

const MODE_CONFIG: Record<RecordMode, ModeConfig> = {
  products: { routePrefix: '/catalogs/products', newSuffix: '/products/new', icon: Package },
  categories: {
    routePrefix: '/catalogs/products/categories',
    newSuffix: '/categories/new',
    icon: Folder,
  },
  groups: {
    routePrefix: '/catalogs/products/groups',
    newSuffix: '/groups/new',
    icon: Layers,
  },
  customers: {
    routePrefix: '/catalogs/partners/customers',
    newSuffix: '/customers/new',
    icon: Users,
  },
  suppliers: {
    routePrefix: '/catalogs/partners/suppliers',
    newSuffix: '/suppliers/new',
    icon: Truck,
  },
  priceTypes: {
    routePrefix: '/catalogs/price-types',
    newSuffix: '/price-types/new',
    icon: Scale,
  },
  specialPrices: {
    routePrefix: '/catalogs/price-types/special',
    newSuffix: '/special/new',
    icon: Tag,
  },
};

function detectMode(pathname: string): RecordMode {
  // Order matters — most specific first.
  if (/\/v2\/catalogs\/products\/categories(\/|$)/.test(pathname)) return 'categories';
  if (/\/v2\/catalogs\/products\/groups(\/|$)/.test(pathname)) return 'groups';
  if (/\/v2\/catalogs\/partners\/customers(\/|$)/.test(pathname)) return 'customers';
  if (/\/v2\/catalogs\/partners\/suppliers(\/|$)/.test(pathname)) return 'suppliers';
  if (/\/v2\/catalogs\/price-types\/special(\/|$)/.test(pathname)) return 'specialPrices';
  if (/\/v2\/catalogs\/price-types(\/|$)/.test(pathname)) return 'priceTypes';
  return 'products';
}

function activeIdFromPath(pathname: string, mode: RecordMode): string | null {
  const seg = pathname.split('/').filter(Boolean);
  const last = seg[seg.length - 1];
  if (!last || !/^[0-9a-f-]{36}$/.test(last)) return null;
  // Cross-mode collision guard: products vs categories/groups, priceTypes vs special.
  if (mode === 'products' && (seg.includes('categories') || seg.includes('groups'))) return null;
  if (mode === 'priceTypes' && seg.includes('special')) return null;
  return last;
}

function rowsForMode(data: RecordListPanelData, mode: RecordMode): Row[] {
  switch (mode) {
    case 'categories':
      return data.categories;
    case 'groups':
      return data.groups;
    case 'customers':
      return data.customers;
    case 'suppliers':
      return data.suppliers;
    case 'priceTypes':
      return data.priceTypes;
    case 'specialPrices':
      return data.specialPrices;
    default:
      return data.products;
  }
}

export function V2RecordListPanelClient({ data }: { data: RecordListPanelData }) {
  const pathname = usePathname();
  const mode = detectMode(pathname);
  const activeId = activeIdFromPath(pathname, mode);

  const cfg = MODE_CONFIG[mode];
  const isNewForMode = pathname.endsWith(cfg.newSuffix);
  const rows = rowsForMode(data, mode);
  const title = data.i18n.titles[mode];
  const draftHref = `${cfg.routePrefix}/new`;
  const rowHrefPrefix = cfg.routePrefix;
  const RowIcon = cfg.icon;

  return (
    <aside className="panel">
      <Link href={cfg.routePrefix} className="panel-back">
        <ChevronLeft size={14} strokeWidth={1.75} />
        {data.i18n.backToCatalogs}
      </Link>
      <div className="panel-divider" />

      <div className="panel-search">
        <Search size={14} strokeWidth={1.75} className="search-icon" />
        <input
          type="text"
          placeholder={data.i18n.searchPlaceholder}
          aria-label={data.i18n.searchPlaceholder}
        />
      </div>

      <div className="panel-title">{title}</div>
      <div className="panel-list">
        {isNewForMode && (
          <Link href={draftHref} className="panel-item is-active">
            <Circle size={14} strokeWidth={1.75} />
            {data.i18n.draft}
          </Link>
        )}
        {rows.map((r) => {
          const isActive = activeId === r.id;
          return (
            <Link
              key={r.id}
              href={`${rowHrefPrefix}/${r.id}`}
              className={`panel-item${isActive ? ' is-active' : ''}`}
            >
              <RowIcon size={14} strokeWidth={1.75} />
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.code ? `${r.code} · ${r.name}` : r.name}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
