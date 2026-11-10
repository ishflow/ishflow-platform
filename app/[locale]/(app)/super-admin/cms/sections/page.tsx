import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { Link } from '@/platform/i18n/navigation';
import { MARKETING_PAGES } from '@/platform/marketing/section-catalog';
import type { SectionType } from '@/platform/marketing/section-schemas';
import { listMarketingSections } from '@/platform/super-admin/marketing';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const TYPE_TO_LABEL_KEY: Record<SectionType, string> = {
  hero: 'hero',
  'feature.cards': 'featureCards',
  social_proof: 'socialProof',
  testimonials: 'testimonials',
  faq: 'faq',
  'footer.columns': 'footerColumns',
};

export default async function SaCmsSectionsPage() {
  const t = await getTranslations('v2_super_admin.cms.sectionsList');
  const dict = await getSaMarketingDict();
  const m = dict.marketing;
  const rows = await listMarketingSections();

  const totalSections = MARKETING_PAGES.reduce((acc, p) => acc + p.sections.length, 0);

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={t('title')}
          subtitle={t('subtitle', { count: totalSections })}
        />
      }
    >
      {MARKETING_PAGES.map((page) => {
        const pageLabel = m.pageLabels[page.pageKey as keyof typeof m.pageLabels] ?? page.label;
        return (
          <div key={page.pageKey}>
            <SaTenantSection title={pageLabel} subtitle={page.pageKey}>
              <table className="data">
                <thead>
                  <tr>
                    <th>{m.sections.columns.section}</th>
                    <th>{m.sections.columns.type}</th>
                    <th>{m.sections.columns.locales}</th>
                    <th>{m.sections.columns.updatedAt}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {page.sections.map((section) => {
                    const matching = rows.filter(
                      (r) => r.pageKey === page.pageKey && r.sectionKey === section.sectionKey,
                    );
                    const locales = matching.map((r) => r.locale);
                    const lastUpdate = matching.reduce<Date | null>(
                      (acc, r) => (acc === null || r.updatedAt > acc ? r.updatedAt : acc),
                      null,
                    );
                    const typeLabel =
                      m.sections.typeLabels[
                        TYPE_TO_LABEL_KEY[section.type] as keyof typeof m.sections.typeLabels
                      ];
                    return (
                      <tr key={section.sectionKey}>
                        <td
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}
                        >
                          {section.sectionKey}
                        </td>
                        <td>{typeLabel}</td>
                        <td>
                          {locales.length === 0 ? (
                            <span className="pill pill-neutral">{m.sections.noLocales}</span>
                          ) : (
                            <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                              {locales.map((l) => (
                                <span
                                  key={l}
                                  className="pill"
                                  style={{ textTransform: 'uppercase' }}
                                >
                                  {l}
                                </span>
                              ))}
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {lastUpdate
                            ? lastUpdate.toISOString().slice(0, 16).replace('T', ' ')
                            : dict.common.dash}
                        </td>
                        <td>
                          <Link
                            href={`/super-admin/cms/sections/${page.pageKey}.${encodeURIComponent(section.sectionKey)}`}
                            className="btn btn-secondary btn-sm"
                          >
                            {dict.common.view}
                            <ArrowRight size={14} strokeWidth={1.75} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SaTenantSection>
            <div className="spacer" />
          </div>
        );
      })}
    </SaCmsPageShell>
  );
}
