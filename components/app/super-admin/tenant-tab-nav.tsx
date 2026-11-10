'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type CoreSlug =
  | 'overview'
  | 'users'
  | 'documents'
  | 'activity'
  | 'subscription'
  | 'addons'
  | 'debug';

const CORE_SLUGS: ReadonlyArray<CoreSlug> = [
  'overview',
  'users',
  'documents',
  'activity',
  'subscription',
  'addons',
  'debug',
];

export interface ExtraTab {
  /** Path segment under `/super-admin/tenants/[id]/`. */
  slug: string;
  label: string;
}

function deriveCurrent(pathname: string, base: string, extraSlugs: ReadonlyArray<string>): string {
  if (pathname === base || pathname === `${base}/`) return 'overview';
  const all = [...CORE_SLUGS.filter((s) => s !== 'overview'), ...extraSlugs];
  for (const slug of all) {
    if (pathname === `${base}/${slug}` || pathname.startsWith(`${base}/${slug}/`)) {
      return slug;
    }
  }
  return 'overview';
}

export function TenantTabNav({
  tenantId,
  dict,
  extraTabs = [],
}: {
  tenantId: string;
  dict: SuperAdminDict['tenantDetail']['tabs'];
  extraTabs?: ReadonlyArray<ExtraTab>;
}) {
  const pathname = usePathname() ?? '';
  const base = `/super-admin/tenants/${tenantId}`;
  const extraSlugs = extraTabs.map((t) => t.slug);
  const current = deriveCurrent(pathname, base, extraSlugs);

  return (
    <Tabs value={current}>
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        {CORE_SLUGS.map((slug) => {
          const href = slug === 'overview' ? base : `${base}/${slug}`;
          return (
            <TabsTrigger key={slug} value={slug} render={<Link href={href} />}>
              {dict[slug]}
            </TabsTrigger>
          );
        })}
        {extraTabs.map((tab) => (
          <TabsTrigger
            key={tab.slug}
            value={tab.slug}
            render={<Link href={`${base}/${tab.slug}`} />}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
