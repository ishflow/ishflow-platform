'use client';

import { activeRailFromPath } from '@/lib/v2-shell/active-rail';
import { RAILS } from '@/lib/v2-shell/nav';
import { Link, usePathname } from '@/platform/i18n/navigation';
import { useTranslations } from 'next-intl';

/**
 * V2 left rail — icon column.
 *
 * Active state is derived from `usePathname()` on the client so it survives
 * Next.js SSR caching (the previous server-side `x-pathname` header read
 * returned stale values when the route was prerendered/cached).
 *
 * `usePathname()` from `@/platform/i18n/navigation` returns the locale-stripped
 * path (e.g. `/documents/sales-invoice/new`), which `activeRailFromPath`
 * handles correctly.
 */
/**
 * `railLinks` (serializable, computed server-side from the user's permissions)
 * lists the visible rails with each rail's effective href — the first *visible*
 * item in that rail, so clicking a rail never lands on a hidden/forbidden page
 * (e.g. a chief_accountant's Admin rail goes to /admin/audit, not the
 * permission-gated /admin/members). Icons/labels come from the client-side
 * `RAILS` by key — the icon components can't cross the RSC boundary.
 */
export function V2Rail({ railLinks }: { railLinks: { key: string; href: string }[] }) {
  const pathname = usePathname();
  const activeRail = activeRailFromPath(pathname);
  const t = useTranslations('v2_nav');
  const defs = new Map(RAILS.map((r) => [r.key, r]));

  return (
    <aside className="rail">
      <div className="rail-brand">
        <img src="/v2-logo.png" alt="ishflow" />
      </div>
      {railLinks.map(({ key, href }) => {
        const def = defs.get(key as (typeof RAILS)[number]['key']);
        if (!def) return null;
        const Icon = def.icon;
        const isActive = def.key === activeRail;
        return (
          <Link
            key={key}
            href={href}
            data-rail={key}
            className={`rail-chip${isActive ? ' is-active' : ''}`}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span className="tip">{t(def.i18nKey)}</span>
          </Link>
        );
      })}
      <div className="rail-spacer" />
    </aside>
  );
}
