import '@/configs';

import { type Locale, getRegistry } from '@/platform/metadata';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

/**
 * Generic V2 super-admin catalog detail shell. Looks up the catalog's detail
 * config in the metadata registry, finds the tab matching `tabKey`, and
 * delegates rendering to that tab's `render` function.
 *
 * Permission gating is the layout's responsibility (see
 * `app/[locale]/v2/super-admin/tenants/[id]/layout.tsx`); by the time a tab
 * render runs the caller is already vetted via `isPlatformAdmin`.
 *
 * Used by every `app/[locale]/v2/super-admin/tenants/[id]/<tab>/page.tsx`
 * wrapper after Faz C.6. Future super-admin entities can plug in by adding a
 * `detail` block to their `defineSuperAdminCatalog` config and adding
 * 4-line wrappers that pass the right `catalogKey` / `tabKey`.
 */
export async function renderV2SuperAdminCatalogDetail({
  catalogKey,
  tabKey,
  params,
}: {
  catalogKey: string;
  tabKey: string;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cfg = getRegistry().superAdminCatalog[catalogKey];
  if (!cfg?.detail) notFound();
  const tab = cfg.detail.tabs.find((t) => t.key === tabKey);
  if (!tab) notFound();
  const locale = (await getLocale()) as Locale;
  return tab.render({ id, locale });
}
