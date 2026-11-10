import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { Link } from '@/platform/i18n/navigation';
import { getBlogPost } from '@/platform/super-admin/marketing';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Operator preview of a blog post — renders each locale's title / excerpt /
 * body (Markdown shown as preformatted text, same approach as the locale-free
 * editor preview). The public site runs the body through the real MDX
 * pipeline; this view only shows the operator what they typed.
 */
export default async function SaCmsBlogPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getBlogPost(id);
  if (!post) notFound();

  const t = await getTranslations('v2_super_admin.cms.blogPreview');
  const dict = await getSaMarketingDict();
  const m = dict.marketing.blog;

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={post.slug}
          subtitle={t('subtitle')}
          actions={
            <Link href={`/super-admin/cms/blog/${post.id}`} className="btn btn-secondary btn-sm">
              {m.edit.backToList}
            </Link>
          }
        />
      }
    >
      {post.translations.length === 0 ? (
        <SaTenantSection title={t('card.title')}>
          <p className="dim" style={{ padding: '8px 0' }}>
            {m.preview.empty}
          </p>
        </SaTenantSection>
      ) : (
        post.translations.map((tr) => (
          <div key={tr.locale}>
            <SaTenantSection title={`${tr.title || post.slug}`} subtitle={tr.locale.toUpperCase()}>
              <article style={{ maxWidth: 760, padding: '12px 4px', lineHeight: 1.6 }}>
                {tr.excerpt ? (
                  <p className="dim" style={{ marginBottom: 16, fontSize: 14 }}>
                    {tr.excerpt}
                  </p>
                ) : null}
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 14,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                  }}
                >
                  {tr.body}
                </pre>
              </article>
            </SaTenantSection>
            <div className="spacer" />
          </div>
        ))
      )}
    </SaCmsPageShell>
  );
}
