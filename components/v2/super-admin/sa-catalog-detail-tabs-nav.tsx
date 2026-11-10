'use client';

import { Link, usePathname } from '@/platform/i18n/navigation';
import {
  Activity,
  CreditCard,
  Edit3,
  FileText,
  GitCommit,
  HeartPulse,
  LayoutDashboard,
  type LucideIcon,
  ShieldCheck,
  Sliders,
  Square,
  Tag,
  Terminal,
  User,
  Users,
  Zap,
} from 'lucide-react';

export type SaCatalogDetailTabItem = {
  key: string;
  label: string;
  icon: string;
  badge?: string;
  href: string;
};

const iconRegistry: Record<string, LucideIcon> = {
  Activity,
  CreditCard,
  Edit3,
  FileText,
  GitCommit,
  HeartPulse,
  LayoutDashboard,
  ShieldCheck,
  Sliders,
  Tag,
  Terminal,
  User,
  Users,
  Zap,
};

/**
 * Client tab nav for super-admin catalog detail pages. Receives a plain-data
 * array of tab items (labels + icon names already resolved on the server) and
 * picks the active tab via `usePathname()`. Unknown icon names fall back to
 * Square so a typo never blanks the nav.
 */
export function SaCatalogDetailTabsNav({
  items,
  basePath,
}: {
  items: SaCatalogDetailTabItem[];
  basePath: string;
}) {
  const pathname = usePathname();
  return (
    <nav
      role="tablist"
      aria-label="Catalog detail"
      style={{
        display: 'flex',
        gap: 2,
        padding: 4,
        background: 'var(--surface-2)',
        borderRadius: 10,
        marginBottom: 16,
        overflowX: 'auto',
      }}
    >
      {items.map((item) => {
        const Icon = iconRegistry[item.icon] ?? Square;
        const isActive =
          item.href === basePath
            ? pathname === basePath
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            role="tab"
            aria-selected={isActive}
            style={{
              flex: '0 0 auto',
              padding: '8px 14px',
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 600,
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              background: isActive ? 'var(--surface)' : 'transparent',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : undefined,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon size={14} strokeWidth={1.75} />
            {item.label}
            {item.badge ? (
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  background: isActive ? 'var(--accent-soft)' : 'var(--surface-2)',
                  color: isActive ? 'var(--accent)' : undefined,
                  borderRadius: 999,
                  fontWeight: 700,
                }}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
