import { restoreSectionVersionV2 } from '@/app/[locale]/(app)/super-admin/cms/_actions';
import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { Link } from '@/platform/i18n/navigation';
import {
  MARKETING_EDITOR_LOCALES,
  findPage,
  findSection,
} from '@/platform/marketing/section-catalog';
import {
  getMarketingSection,
  listMarketingSectionVersions,
} from '@/platform/super-admin/marketing';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function decodeId(id: string): { pageKey: string; sectionKey: string } | null {
  const dot = id.indexOf('.');
  if (dot <= 0) return null;
  return { pageKey: id.slice(0, dot), sectionKey: decodeURIComponent(id.slice(dot + 1)) };
}

export default async function SaCmsSectionVersionsPage({
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

  const t = await getTranslations('v2_super_admin.cms.sectionVersions');
  const dict = await getSaMarketingDict();
  const v = dict.marketing.sections.versions;

  const groups: Array<{
    locale: string;
    versions: Awaited<ReturnType<typeof listMarketingSectionVersions>>;
  }> = [];
  for (const locale of MARKETING_EDITOR_LOCALES) {
    const row = await getMarketingSection(pageKey, sectionKey, locale);
    if (!row) continue;
    groups.push({ locale, versions: await listMarketingSectionVersions(row.id) });
  }

  const total = groups.reduce((acc, g) => acc + g.versions.length, 0);

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={`${page.label} · ${section.label}`}
          subtitle={t('subtitle', { count: total })}
          actions={
            <Link href={`/super-admin/cms/sections/${id}`} className="btn btn-secondary btn-sm">
              {dict.marketing.sections.edit.backToList}
            </Link>
          }
        />
      }
    >
      {groups.length === 0 ? (
        <SaTenantSection title={v.title}>
          <p className="dim" style={{ padding: '8px 0' }}>
            {v.empty}
          </p>
        </SaTenantSection>
      ) : (
        groups.map((group) => (
          <div key={group.locale}>
            <SaTenantSection title={v.title} subtitle={group.locale.toUpperCase()}>
              <table className="data">
                <thead>
                  <tr>
                    <th>{v.columns.createdAt}</th>
                    <th>{v.columns.actor}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {group.versions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="dim">
                        {v.empty}
                      </td>
                    </tr>
                  ) : (
                    group.versions.map((ver) => (
                      <tr key={ver.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {ver.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                        </td>
                        <td
                          className="dim"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                        >
                          {ver.createdBy.slice(0, 8)}…
                        </td>
                        <td>
                          <form action={restoreSectionVersionV2}>
                            <input type="hidden" name="versionId" value={ver.id} />
                            <input type="hidden" name="sectionId" value={id} />
                            <button type="submit" className="btn btn-secondary btn-sm">
                              {v.restore}
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </SaTenantSection>
            <div className="spacer" />
          </div>
        ))
      )}
    </SaCmsPageShell>
  );
}
