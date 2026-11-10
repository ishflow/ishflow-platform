import { V2Topbar } from '@/components/v2/shell/topbar';
import type { Locale } from '@/platform/metadata';
import { getTranslations, setRequestLocale } from 'next-intl/server';

/**
 * Catalogs hub page. Renders just the topbar — the actual catalog entity
 * list lives in the middle side panel (`V2CatalogNav`), which the v2 shell
 * already mounts for any `/catalogs/*` route.
 *
 * Visiting `/catalogs` directly (e.g. via the side panel's "← Каталоги"
 * back link from a record page) previously 404'd because no page existed.
 */
export default async function V2CatalogsHubPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tCommon = await getTranslations('v2_catalogs.common');

  return (
    <>
      <V2Topbar breadcrumb="" title={tCommon('catalogsSection')} subtitle="" />
      <div
        className="content"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        {tCommon('catalogsHubHint')}
      </div>
    </>
  );
}
