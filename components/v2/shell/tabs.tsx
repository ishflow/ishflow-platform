'use client';

import { activeRailFromPath } from '@/lib/v2-shell/active-rail';
import { RAILS } from '@/lib/v2-shell/nav';
import { tabLabelFromPath } from '@/lib/v2-shell/tab-label';
import { Link, usePathname, useRouter } from '@/platform/i18n/navigation';
import { type LucideIcon, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { shouldPinTab } from './tab-policy';

export { shouldPinTab };

type OpenedTab = {
  /** locale-stripped href, e.g. "/dashboard" */
  href: string;
  /** i18n namespace + key resolved from the pathname (page-specific label) */
  labelNs: string;
  labelKey: string;
  /** rail key (still tracked for icon lookup + back-compat persistence) */
  i18nKey: string;
  /** lucide icon name from the rails registry */
  iconKey: string;
};

const STORAGE_KEY = 'v2:opened-tabs:v2';
const MAX_TABS = 12;

/**
 * V2 tab bar — variant-9 parity.
 *
 * Tracks "opened" routes in `localStorage`. Each visited V2 page becomes a
 * pinned tab; clicking the × closes it (and navigates to a remaining tab if
 * the closed tab was active). The "+" button shows a future-spot for "open
 * new tab" — left non-functional in v0.3.
 *
 * This is a SEPARATE system from V1's `NEXT_PUBLIC_ENABLE_TABS` iframe-tab
 * stack. V2 tabs are simple SPA-style route bookmarks, no iframes.
 */
export function V2Tabs() {
  const pathname = usePathname();
  const router = useRouter();
  // Both namespaces are consulted at render time — each tab knows its own.
  const tRail = useTranslations('v2_nav.rail');
  const tTabs = useTranslations('v2_nav.tabs');
  const tCatalogsCommon = useTranslations('v2_catalogs.common');
  const tProductsList = useTranslations('v2_catalogs.products.list');
  const tProductsCategoriesList = useTranslations('v2_catalogs.products.categories.list');
  const tProductsGroupsList = useTranslations('v2_catalogs.products.groups.list');
  const tCustomersList = useTranslations('v2_catalogs.partners.customers.list');
  const tSuppliersList = useTranslations('v2_catalogs.partners.suppliers.list');
  const tPriceTypesList = useTranslations('v2_catalogs.priceTypes.list');
  const tSpecialList = useTranslations('v2_catalogs.priceTypes.special.list');
  const [tabs, setTabs] = useState<OpenedTab[]>([]);
  const [mounted, setMounted] = useState(false);

  function resolveTabLabel(ns: string, key: string): string {
    switch (ns) {
      case 'v2_nav.tabs':
        return tTabs(key);
      case 'v2_catalogs.common':
        return tCatalogsCommon(key);
      case 'v2_catalogs.products.list':
        return tProductsList(key);
      case 'v2_catalogs.products.categories.list':
        return tProductsCategoriesList(key);
      case 'v2_catalogs.products.groups.list':
        return tProductsGroupsList(key);
      case 'v2_catalogs.partners.customers.list':
        return tCustomersList(key);
      case 'v2_catalogs.partners.suppliers.list':
        return tSuppliersList(key);
      case 'v2_catalogs.priceTypes.list':
        return tPriceTypesList(key);
      case 'v2_catalogs.priceTypes.special.list':
        return tSpecialList(key);
      default:
        return tRail(key);
    }
  }

  // Hydrate from localStorage once on mount
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OpenedTab[];
        if (Array.isArray(parsed)) setTabs(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Auto-pin the current route as a tab on every navigation
  useEffect(() => {
    if (!mounted) return;
    if (!shouldPinTab(pathname)) return;
    const railKey = activeRailFromPath(pathname);
    const railDef = RAILS.find((r) => r.key === railKey);
    if (!railDef) return;

    // For top-level rail pages, dedupe on href. For deeper routes (e.g.
    // /v2/documents/sales-invoice/INVOICE-000005), each id gets its own tab.
    const label = tabLabelFromPath(pathname);
    const candidate: OpenedTab = {
      href: pathname,
      labelNs: label.ns,
      labelKey: label.key,
      i18nKey: railKey,
      iconKey: railDef.key,
    };

    setTabs((prev) => {
      if (prev.some((t) => t.href === pathname)) return prev;
      const next = [...prev, candidate].slice(-MAX_TABS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, [pathname, mounted]);

  const closeTab = useCallback(
    (e: React.MouseEvent, href: string) => {
      e.preventDefault();
      e.stopPropagation();
      setTabs((prev) => {
        const next = prev.filter((t) => t.href !== href);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        if (href === pathname) {
          const fallback = next[next.length - 1]?.href ?? '/dashboard';
          router.push(fallback);
        }
        return next;
      });
    },
    [pathname, router],
  );

  // Before hydration: render an empty nav so SSR markup matches first client paint
  if (!mounted) {
    return <nav className="tabs" aria-label="Tabs" />;
  }

  return (
    <nav className="tabs" aria-label="Tabs">
      {tabs.map((tab) => {
        const railDef = RAILS.find((r) => r.key === tab.iconKey);
        const Icon: LucideIcon | undefined = railDef?.icon;
        const isActive = tab.href === pathname;
        // Older persisted tabs may lack labelNs/labelKey — fall back to the
        // rail label so we don't crash mid-render.
        const labelText = tab.labelNs
          ? resolveTabLabel(tab.labelNs, tab.labelKey)
          : tRail(tab.i18nKey);
        return (
          <Link key={tab.href} href={tab.href} className={`tab${isActive ? ' is-active' : ''}`}>
            {Icon ? <Icon size={14} strokeWidth={1.75} /> : null}
            <span className="tab-label">{labelText}</span>
            <button
              type="button"
              className="tab-close"
              aria-label="Close tab"
              onClick={(e) => closeTab(e, tab.href)}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </Link>
        );
      })}
      <button type="button" className="tab-new" aria-label="New tab" style={{ display: 'none' }}>
        <Plus size={14} strokeWidth={1.75} />
      </button>
    </nav>
  );
}
