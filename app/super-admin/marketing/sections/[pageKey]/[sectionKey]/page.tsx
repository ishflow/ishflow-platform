import { SectionEditor } from '@/components/app/super-admin/marketing/section-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MARKETING_EDITOR_LOCALES,
  type MarketingEditorLocale,
  findPage,
  findSection,
} from '@/platform/marketing/section-catalog';
import { getSectionDefaults } from '@/platform/marketing/section-schemas';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getMarketingSection } from '@/platform/super-admin/marketing';
import { History } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ pageKey: string; sectionKey: string }>;
}

const TYPE_TO_LABEL_KEY = {
  hero: 'hero',
  'feature.cards': 'featureCards',
  social_proof: 'socialProof',
  testimonials: 'testimonials',
  faq: 'faq',
  'footer.columns': 'footerColumns',
} as const;

export default async function EditMarketingSectionPage({ params }: PageProps) {
  const { pageKey, sectionKey } = await params;
  const decodedSectionKey = decodeURIComponent(sectionKey);
  const page = findPage(pageKey);
  const section = findSection(pageKey, decodedSectionKey);
  if (!page || !section) notFound();

  const dict = await getSuperAdminDict();
  const m = dict.marketing;

  const rowsByLocale: Record<MarketingEditorLocale, unknown> = {} as Record<
    MarketingEditorLocale,
    unknown
  >;
  for (const locale of MARKETING_EDITOR_LOCALES) {
    const row = await getMarketingSection(pageKey, decodedSectionKey, locale);
    rowsByLocale[locale] = row?.content ?? null;
  }

  const initialByLocale = MARKETING_EDITOR_LOCALES.reduce(
    (acc, l) => {
      acc[l] = rowsByLocale[l] ?? getSectionDefaults(section.type);
      return acc;
    },
    {} as Record<MarketingEditorLocale, unknown>,
  );

  const hasAnyRow = Object.values(rowsByLocale).some((v) => v !== null);
  const typeLabel = m.sections.typeLabels[TYPE_TO_LABEL_KEY[section.type]];
  const pageLabel = m.pageLabels[page.pageKey as keyof typeof m.pageLabels] ?? page.label;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Button variant="ghost" size="sm" render={<Link href="/super-admin/marketing/sections" />}>
          {m.sections.edit.backToList}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {pageLabel} · {section.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              <code className="text-xs">
                {page.pageKey}.{decodedSectionKey}
              </code>{' '}
              · {typeLabel}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={`/super-admin/marketing/sections/${page.pageKey}/${encodeURIComponent(decodedSectionKey)}/versions`}
              />
            }
          >
            <History className="mr-2 h-4 w-4" />
            {m.sections.edit.history}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{typeLabel}</CardTitle>
          <CardDescription>
            {hasAnyRow ? `${m.sections.edit.localeTabsLabel}` : m.common.defaultsNotice}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SectionEditor
            pageKey={page.pageKey}
            sectionKey={decodedSectionKey}
            type={section.type}
            initialByLocale={initialByLocale}
            defaults={getSectionDefaults(section.type)}
            dict={m}
            commonSave={dict.common.save}
          />
        </CardContent>
      </Card>
    </div>
  );
}
