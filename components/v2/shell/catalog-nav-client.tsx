'use client';

import { Link, usePathname } from '@/platform/i18n/navigation';
import { Box, Building2, Coins, Package, Scale, Search, Tag, Users, Wallet } from 'lucide-react';
import type { ComponentType } from 'react';

export type CatalogEntry = {
  key: string;
  label: string;
  labelOverride?: string;
  href: string | null;
  count: number;
  iconName: 'Box' | 'Building2' | 'Coins' | 'Package' | 'Scale' | 'Tag' | 'Users' | 'Wallet';
};

export type CatalogNavI18n = {
  searchPlaceholder: string;
  sectionTitle: string;
};

const ICON_MAP: Record<
  CatalogEntry['iconName'],
  ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  Box,
  Building2,
  Coins,
  Package,
  Scale,
  Tag,
  Users,
  Wallet,
};

function matchLen(pathname: string, href: string | null): number {
  if (!href) return -1;
  if (pathname === href) return href.length;
  if (pathname.startsWith(`${href}/`)) return href.length;
  return -1;
}

export function V2CatalogNavClient({
  entries,
  i18n,
}: {
  entries: CatalogEntry[];
  i18n: CatalogNavI18n;
}) {
  const pathname = usePathname();

  // Pick the most specific (longest-href) matching entry as active. Without
  // this, a child route like /v2/catalogs/price-types/special would highlight
  // both itself AND its parent /v2/catalogs/price-types.
  const bestMatchLen = entries.reduce((max, e) => Math.max(max, matchLen(pathname, e.href)), -1);

  return (
    <aside className="panel">
      <div className="panel-search">
        <Search size={14} strokeWidth={1.75} className="search-icon" />
        <input
          type="text"
          placeholder={i18n.searchPlaceholder}
          aria-label={i18n.searchPlaceholder}
        />
      </div>

      <div className="panel-title">{i18n.sectionTitle}</div>
      <div className="panel-list">
        {entries.map((e) => {
          const Icon = ICON_MAP[e.iconName];
          const label = e.labelOverride ?? e.label;
          const isActive = bestMatchLen > 0 && matchLen(pathname, e.href) === bestMatchLen;

          if (!e.href) {
            return (
              <span
                key={e.key}
                className="panel-item"
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                aria-disabled="true"
              >
                <Icon size={14} strokeWidth={1.75} />
                <span style={{ flex: 1 }}>{label}</span>
                <span className="count">{e.count}</span>
              </span>
            );
          }
          return (
            <Link key={e.key} href={e.href} className={`panel-item${isActive ? ' is-active' : ''}`}>
              <Icon size={14} strokeWidth={1.75} />
              <span style={{ flex: 1 }}>{label}</span>
              <span className="count">{e.count}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
