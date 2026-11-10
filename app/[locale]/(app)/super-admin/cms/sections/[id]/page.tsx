import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { SectionEditor } from '@/components/app/super-admin/marketing/section-editor';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { Link } from '@/platform/i18n/navigation';
import {
  MARKETING_EDITOR_LOCALES,
  type MarketingEditorLocale,
  findPage,
  findSection,
} from '@/platform/marketing/section-catalog';
import { getSectionDefaults } from '@/platform/marketing/section-schemas';
import { getMarketingSection } from '@/platform/super-admin/marketing';
import { GitBranch } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Route param `id` is `pageKey.sectionKey` (pageKey never contains a dot). */
function decodeId(id: string): { pageKey: string; sectionKey: string } | null {
  const dot = id.indexOf('.');
  if (dot <= 0) return null;
  return { pageKey: id.slice(0, dot), sectionKey: decodeURIComponent(id.slice(dot + 1)) };
}

export default async function SaCmsSectionEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decoded = decodeId(id);
  if (!decoded) notFound();
  const { pageKey, sectionKey } = decoded;
  const page = findPage(pageKey);
  const section = findSection(pageKey, sectionKey);
  if (!page || !section) notFound();

  const t = await getTranslations('v2_super_admin.cms.sectionEditor');
  const dict = await getSaMarketingDict();
  const m = dict.marketing;

  const initialByLocale = {} as Record<MarketingEditorLocale, unknown>;
  for (const locale of MARKETING_EDITOR_LOCALES) {
    const row = await getMarketingSection(pageKey, sectionKey, locale);
    initialByLocale[locale] = row?.content ?? getSectionDefaults(section.type);
  }

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={`${page.label} · ${section.label}`}
          subtitle={`${page.pageKey}.${sectionKey}`}
          actions={
            <Link
              href={`/super-admin/cms/sections/${id}/versions`}
              className="btn btn-secondary btn-sm"
            >
              <GitBranch size={14} strokeWidth={1.75} />
              {t('versions')}
            </Link>
          }
        />
      }
    >
      <SaTenantSection title={section.label}>
        <SectionEditor
          pageKey={pageKey}
          sectionKey={sectionKey}
          type={section.type}
          initialByLocale={initialByLocale}
          defaults={getSectionDefaults(section.type)}
          dict={m}
          commonSave={dict.common.save}
        />
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
