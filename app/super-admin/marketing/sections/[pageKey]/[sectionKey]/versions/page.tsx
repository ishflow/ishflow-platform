import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MARKETING_EDITOR_LOCALES,
  findPage,
  findSection,
} from '@/platform/marketing/section-catalog';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import {
  getMarketingSection,
  listMarketingSectionVersions,
} from '@/platform/super-admin/marketing';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { restoreSectionVersion } from '@/app/super-admin/marketing/_actions/sections';

interface PageProps {
  params: Promise<{ pageKey: string; sectionKey: string }>;
}

export default async function SectionVersionsPage({ params }: PageProps) {
  const { pageKey, sectionKey } = await params;
  const decodedSectionKey = decodeURIComponent(sectionKey);
  const page = findPage(pageKey);
  const section = findSection(pageKey, decodedSectionKey);
  if (!page || !section) notFound();

  const dict = await getSuperAdminDict();
  const m = dict.marketing;

  // Collect versions across all locales for this (page, section). One
  // section row per locale, so iterate.
  const versionGroups: Array<{
    locale: string;
    versions: Awaited<ReturnType<typeof listMarketingSectionVersions>>;
  }> = [];
  for (const locale of MARKETING_EDITOR_LOCALES) {
    const row = await getMarketingSection(pageKey, decodedSectionKey, locale);
    if (!row) continue;
    const versions = await listMarketingSectionVersions(row.id);
    versionGroups.push({ locale, versions });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              href={`/super-admin/marketing/sections/${page.pageKey}/${encodeURIComponent(decodedSectionKey)}`}
            />
          }
        >
          {m.sections.edit.backToList}
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{m.sections.versions.title}</h1>
        <p className="text-sm text-muted-foreground">
          <code className="text-xs">
            {page.pageKey}.{decodedSectionKey}
          </code>
        </p>
      </header>

      {versionGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{m.sections.versions.empty}</p>
      ) : (
        versionGroups.map(({ locale, versions }) => (
          <Card key={locale}>
            <CardHeader>
              <CardTitle className="text-base uppercase">{locale}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.sections.versions.columns.createdAt}</TableHead>
                    <TableHead>{m.sections.versions.columns.actor}</TableHead>
                    <TableHead className="text-right">
                      {m.sections.versions.columns.actions}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-sm text-muted-foreground">
                        {m.sections.versions.empty}
                      </TableCell>
                    </TableRow>
                  ) : (
                    versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-xs font-mono">
                          {v.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {v.createdBy.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="text-right">
                          <form action={restoreSectionVersion}>
                            <input type="hidden" name="versionId" value={v.id} />
                            <input type="hidden" name="pageKey" value={page.pageKey} />
                            <input type="hidden" name="sectionKey" value={decodedSectionKey} />
                            <Button type="submit" variant="outline" size="sm">
                              {m.sections.versions.restore}
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
