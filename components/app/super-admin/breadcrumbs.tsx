'use client';

/**
 * Path-driven breadcrumbs for the Super Admin shell.
 *
 * The component reads `usePathname()` and turns each path segment into a
 * breadcrumb. Known segments (`tenants`, `audit`, …) are localized via the
 * SA dict. Opaque segments (UUIDs, dynamic ids) are rendered verbatim — the
 * destination pages render real names; the breadcrumb is just a back-affordance.
 *
 * Hidden when the active route is the SA dashboard root, because the only
 * crumb would be the root itself.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { SuperAdminDict } from '@/platform/super-admin/dict';

const SUPER_ADMIN_ROOT = '/super-admin';

type NavItems = SuperAdminDict['nav']['items'];

/**
 * Map a path segment to a localized label. Returns `undefined` when the
 * segment is dynamic (id-like) so callers can fall back to the raw text.
 */
function labelForSegment(segment: string, nav: NavItems): string | undefined {
  switch (segment) {
    case 'tenants':
      return nav.tenants;
    case 'users':
      return nav.users;
    case 'audit':
      return nav.audit;
    case 'analytics':
      return nav.analytics;
    case 'revenue':
      return nav.revenue;
    case 'billing':
      return nav.billing;
    case 'communications':
      return nav.communications;
    case 'marketing':
      return nav.marketing;
    case 'system':
      return nav.system;
    case 'support':
      return nav.support;
    default:
      return undefined;
  }
}

/**
 * UUIDs and other opaque identifiers should not be auto-uppercased; render
 * them as a short suffix instead so the bar stays compact.
 */
function fallbackLabel(segment: string): string {
  if (segment.length > 12 && /^[0-9a-f-]+$/i.test(segment)) {
    return `${segment.slice(0, 6)}…${segment.slice(-4)}`;
  }
  return segment;
}

interface Crumb {
  readonly href: string;
  readonly label: string;
  readonly isCurrent: boolean;
}

function buildCrumbs(
  pathname: string,
  dict: SuperAdminDict['shell']['breadcrumb'],
  nav: NavItems,
): ReadonlyArray<Crumb> {
  if (!pathname.startsWith(SUPER_ADMIN_ROOT)) return [];
  const rest = pathname.slice(SUPER_ADMIN_ROOT.length).split('/').filter(Boolean);

  const crumbs: Crumb[] = [];
  crumbs.push({
    href: SUPER_ADMIN_ROOT,
    label: dict.root,
    isCurrent: rest.length === 0,
  });

  let acc = SUPER_ADMIN_ROOT;
  rest.forEach((segment, idx) => {
    acc = `${acc}/${segment}`;
    const isCurrent = idx === rest.length - 1;
    const label = labelForSegment(segment, nav) ?? fallbackLabel(segment);
    crumbs.push({ href: acc, label, isCurrent });
  });

  return crumbs;
}

export interface SuperAdminBreadcrumbsProps {
  readonly dict: SuperAdminDict['shell']['breadcrumb'];
  readonly nav: NavItems;
}

export function SuperAdminBreadcrumbs({ dict, nav }: SuperAdminBreadcrumbsProps) {
  const pathname = usePathname() ?? SUPER_ADMIN_ROOT;
  const crumbs = useMemo(() => buildCrumbs(pathname, dict, nav), [pathname, dict, nav]);

  // Hide the breadcrumb entirely on the dashboard root — there would only be
  // a single crumb and it would duplicate the page header.
  if (crumbs.length <= 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((c, idx) => (
          <BreadcrumbItem key={c.href}>
            {c.isCurrent ? (
              <BreadcrumbPage>{c.label}</BreadcrumbPage>
            ) : (
              <>
                <BreadcrumbLink render={<Link href={c.href} />}>{c.label}</BreadcrumbLink>
                {idx < crumbs.length - 1 ? <BreadcrumbSeparator /> : null}
              </>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
