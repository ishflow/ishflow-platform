import '@/configs';

import { getRegistry } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';
import { type SaCatalogDetailTabItem, SaCatalogDetailTabsNav } from './sa-catalog-detail-tabs-nav';

/**
 * Server component that derives the detail tab nav from a super-admin
 * catalog's metadata. Resolves i18n labels server-side, then hands a plain
 * array to the small client component that owns the `usePathname()` active
 * check + Lucide icon lookup.
 */
export async function SaCatalogDetailTabs({
  catalogKey,
  basePath,
  i18nNamespace,
}: {
  catalogKey: string;
  basePath: string;
  i18nNamespace: string;
}) {
  const cfg = getRegistry().superAdminCatalog[catalogKey];
  if (!cfg?.detail) return null;
  const t = await getTranslations(i18nNamespace);

  const items: SaCatalogDetailTabItem[] = cfg.detail.tabs.map((tab) => ({
    key: tab.key,
    label: t.has(tab.key) ? t(tab.key) : tab.key,
    icon: tab.icon,
    badge: tab.badge,
    href: tab.segment ? `${basePath}/${tab.segment}` : basePath,
  }));

  return <SaCatalogDetailTabsNav items={items} basePath={basePath} />;
}
