import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { Link } from '@/platform/i18n/navigation';
import { findPage } from '@/platform/marketing/section-catalog';
import { listMarketingSections } from '@/platform/super-admin/marketing';
import { ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

/**
 * Landing-page section overview. The public home page is composed from the
 * `home` page sections in the marketing catalog; each row links into the real
 * section editor (`/super-admin/cms/sections/...`). Honest replacement for the
 * old drag-to-reorder mock — reorder/enable is not a backend concept, sections
 * render in catalog order and show content when at least one locale is filled.
 */
export default async function SaMarketingLandingPage() {
  const t = await getTranslations('v2_super_admin.marketingLanding');
  const dict = await getSaMarketingDict();
  const m = dict.marketing;
  const home = findPage('home');
  const rows = await listMarketingSections();

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={t('title')}
          subtitle={t('subtitle')}
          actions={
            <a
              href="https://ishflow.com"
              className="btn btn-secondary btn-sm"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} strokeWidth={1.75} />
              {t('viewLive')}
            </a>
          }
        />
      }
    >
      <SaTenantSection title={t('sections.title')}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(home?.sections ?? []).map((section, i) => {
            const locales = rows
              .filter((r) => r.pageKey === 'home' && r.sectionKey === section.sectionKey)
              .map((r) => r.locale);
            return (
              <div
                key={section.sectionKey}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 12,
                  padding: '12px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  alignItems: 'center',
                  fontSize: 13.5,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{section.label}</div>
                  <div
                    className="dim"
                    style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', marginTop: 2 }}
                  >
                    home.{section.sectionKey}
                  </div>
                </div>
                {locales.length === 0 ? (
                  <span className="pill pill-neutral">{m.sections.noLocales}</span>
                ) : (
                  <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                    {locales.map((l) => (
                      <span key={l} className="pill" style={{ textTransform: 'uppercase' }}>
                        {l}
                      </span>
                    ))}
                  </span>
                )}
                <Link
                  href={`/super-admin/cms/sections/home.${encodeURIComponent(section.sectionKey)}`}
                  className="btn btn-secondary btn-sm"
                >
                  {t('sections.edit')}
                </Link>
              </div>
            );
          })}
        </div>
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
