import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { BlogEditor } from '@/components/app/super-admin/marketing/blog-editor';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { getBlogPost } from '@/platform/super-admin/marketing';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SaCmsBlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getBlogPost(id);
  if (!post) notFound();

  const t = await getTranslations('v2_super_admin.cms.blogDetail');
  const dict = await getSaMarketingDict();
  const m = dict.marketing.blog;

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={post.slug}
          subtitle={`${post.authorName} · ${m.statusLabels[post.status]}`}
        />
      }
    >
      <SaTenantSection title={t('body.title')}>
        <BlogEditor
          postId={post.id}
          slug={post.slug}
          status={post.status}
          authorName={post.authorName}
          tags={post.tags}
          heroImageUrl={post.heroImageUrl}
          translations={post.translations}
          dict={dict.marketing}
          saveLabel={dict.common.save}
          previewHref={`/super-admin/cms/blog/${post.id}/preview`}
        />
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
