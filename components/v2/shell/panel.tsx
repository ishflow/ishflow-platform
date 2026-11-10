'use client';

import { activeRailFromPath } from '@/lib/v2-shell/active-rail';
import { PANELS, type PanelItem } from '@/lib/v2-shell/nav';
import { Link, usePathname } from '@/platform/i18n/navigation';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { PanelSearch } from './panel-search';

/**
 * V2 middle panel — section sub-nav.
 *
 * Active state derived from `usePathname()` so it survives SSR caching.
 * `itemHrefs` (serializable, computed server-side from the user's permissions)
 * is the allow-list of visible item hrefs — including nested child hrefs; we
 * filter the imported `PANELS` by it (keeping icon components client-side). A
 * role only sees what it may use. The account/tenant footer widget was removed
 * — the top-right avatar menu is the single account surface now.
 *
 * Items carrying `children` render as an expandable disclosure (e.g. the
 * Turnover (Ciro) report group): the parent row toggles its children open and
 * never navigates; children render indented below. Items without children
 * render as a plain link exactly as before.
 */
export function V2Panel({ itemHrefs }: { itemHrefs: string[] }) {
  const pathname = usePathname();
  const activeRail = activeRailFromPath(pathname);
  const t = useTranslations('v2_nav');
  const allowed = new Set(itemHrefs);

  // Filter both items and their children by the server-computed allow-list.
  const sections = (PANELS[activeRail] ?? [])
    .map((s) => ({
      ...s,
      items: s.items
        .filter((i) => allowed.has(i.href))
        .map((i) => ({
          ...i,
          children: i.children?.filter((c) => allowed.has(c.href)),
        })),
    }))
    .filter((s) => s.items.length > 0);

  // Listen to PanelSearch's custom event and filter visible items by their
  // translated label (parent OR any child label). Sections whose every item is
  // filtered out are hidden too.
  const [filter, setFilter] = useState('');
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ q: string }>).detail;
      setFilter(detail?.q ?? '');
    };
    window.addEventListener('v2-panel-search', handler);
    return () => window.removeEventListener('v2-panel-search', handler);
  }, []);

  const matches = (item: PanelItem): boolean => {
    if (!filter) return true;
    if (t(item.i18nKey).toLowerCase().includes(filter)) return true;
    return (item.children ?? []).some((c) => t(c.i18nKey).toLowerCase().includes(filter));
  };

  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter(matches),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="panel">
      <PanelSearch />
      {filteredSections.map((section) => (
        <div key={section.i18nKey}>
          <div className="panel-title">{t(section.i18nKey)}</div>
          <div className="panel-list">
            {section.items.map((item) =>
              item.children && item.children.length > 0 ? (
                <PanelGroup key={item.href} item={item} pathname={pathname} t={t} />
              ) : (
                <PanelLink key={item.href} item={item} pathname={pathname} t={t} />
              ),
            )}
          </div>
        </div>
      ))}
    </aside>
  );
}

/** A leaf nav item — renders identically to the pre-nesting panel item. */
function PanelLink({
  item,
  pathname,
  t,
  nested = false,
}: {
  item: PanelItem;
  pathname: string;
  t: ReturnType<typeof useTranslations>;
  nested?: boolean;
}) {
  const isActive = pathname.endsWith(item.href);
  const ItemIcon = item.icon;
  return (
    <Link
      href={item.href}
      className={`panel-item${isActive ? ' is-active' : ''}`}
      style={nested ? { paddingLeft: 32, height: 32, fontSize: 13.5 } : undefined}
    >
      {ItemIcon ? <ItemIcon size={16} strokeWidth={1.75} /> : null}
      {t(item.i18nKey)}
    </Link>
  );
}

/**
 * An expandable parent item. The row toggles its children open/closed and does
 * NOT navigate. Defaults open when a child matches the current path so a deep
 * link reveals its siblings.
 */
function PanelGroup({
  item,
  pathname,
  t,
}: {
  item: PanelItem;
  pathname: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const children = item.children ?? [];
  const childActive = children.some((c) => pathname.endsWith(c.href));
  const [open, setOpen] = useState(childActive);
  const ItemIcon = item.icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`panel-item${childActive ? ' is-active' : ''}`}
        style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
      >
        {ItemIcon ? <ItemIcon size={16} strokeWidth={1.75} /> : null}
        {t(item.i18nKey)}
        <ChevronRight
          size={14}
          strokeWidth={2}
          style={{
            marginLeft: 'auto',
            transition: 'transform .12s ease',
            transform: open ? 'rotate(90deg)' : 'none',
          }}
        />
      </button>
      {open ? (
        <div className="panel-list">
          {children.map((child) => (
            <PanelLink key={child.href} item={child} pathname={pathname} t={t} nested />
          ))}
        </div>
      ) : null}
    </>
  );
}
