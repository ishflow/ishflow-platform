import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MARKETING_PAGES } from '@/platform/marketing/section-catalog';
import type { SectionType } from '@/platform/marketing/section-schemas';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { listMarketingSections } from '@/platform/super-admin/marketing';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const TYPE_TO_LABEL_KEY: Record<
  SectionType,
  keyof Awaited<ReturnType<typeof getSuperAdminDict>>['marketing']['sections']['typeLabels']
> = {
  hero: 'hero',
  'feature.cards': 'featureCards',
  social_proof: 'socialProof',
  testimonials: 'testimonials',
  faq: 'faq',
  'footer.columns': 'footerColumns',
};

export default async function MarketingSectionsPage() {
  const dict = await getSuperAdminDict();
  const m = dict.marketing;
  const rows = await listMarketingSections();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{m.sections.title}</h1>
        <p className="text-sm text-muted-foreground">{m.sections.subtitle}</p>
      </header>

      <div className="space-y-4">
        {MARKETING_PAGES.map((page) => {
          const pageLabel = m.pageLabels[page.pageKey as keyof typeof m.pageLabels] ?? page.label;
          return (
            <Card key={page.pageKey}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{pageLabel}</CardTitle>
                <CardDescription>
                  <code className="text-xs">{page.pageKey}</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{m.sections.columns.section}</TableHead>
                      <TableHead>{m.sections.columns.type}</TableHead>
                      <TableHead>{m.sections.columns.locales}</TableHead>
                      <TableHead>{m.sections.columns.updatedAt}</TableHead>
                      <TableHead className="text-right">&nbsp;</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {page.sections.map((section) => {
                      const matching = rows.filter(
                        (r) => r.pageKey === page.pageKey && r.sectionKey === section.sectionKey,
                      );
                      const locales = matching.map((r) => r.locale);
                      const lastUpdate = matching.reduce<Date | null>(
                        (acc, r) => (acc === null || r.updatedAt > acc ? r.updatedAt : acc),
                        null,
                      );
                      const labelKey = TYPE_TO_LABEL_KEY[section.type];
                      const typeLabel = m.sections.typeLabels[labelKey];
                      return (
                        <TableRow key={section.sectionKey}>
                          <TableCell className="font-mono text-xs">{section.sectionKey}</TableCell>
                          <TableCell>{typeLabel}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {locales.length === 0 ? (
                                <Badge variant="outline" className="text-muted-foreground">
                                  {m.sections.noLocales}
                                </Badge>
                              ) : (
                                locales.map((l) => (
                                  <Badge key={l} variant="secondary" className="uppercase">
                                    {l}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {lastUpdate
                              ? lastUpdate.toISOString().slice(0, 19).replace('T', ' ')
                              : dict.common.dash}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              render={
                                <Link
                                  href={`/super-admin/marketing/sections/${page.pageKey}/${encodeURIComponent(section.sectionKey)}`}
                                />
                              }
                            >
                              {dict.common.view}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
