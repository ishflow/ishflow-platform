import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { Link } from '@/platform/i18n/navigation';
import { listBlogPosts } from '@/platform/super-admin/marketing';
import type { BlogPostStatus } from '@prisma/client';
import { Eye, Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

function statusPill(status: BlogPostStatus): string {
  if (status === 'published') return 'pill pill-success';
  if (status === 'draft') return 'pill pill-warning';
  return 'pill pill-neutral';
}

export default async function SaCmsBlogListPage() {
  const t = await getTranslations('v2_super_admin.cms.blogList');
  const dict = await getSaMarketingDict();
  const m = dict.marketing.blog;
  const posts = await listBlogPosts();

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={t('title')}
          subtitle={t('subtitle', { count: posts.length })}
          actions={
            <Link href="/super-admin/cms/blog/new" className="btn btn-primary btn-sm">
              <Plus size={14} strokeWidth={1.75} />
              {t('newPost')}
            </Link>
          }
        />
      }
    >
      <SaTenantSection title={t('card.title')}>
        <table className="data">
          <thead>
            <tr>
              <th>{m.columns.slug}</th>
              <th>{m.columns.author}</th>
              <th>{m.columns.status}</th>
              <th>{m.columns.updatedAt}</th>
              <th>{m.columns.publishedAt}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="dim">
                  {m.empty}
                </td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link
                      href={`/super-admin/cms/blog/${p.id}`}
                      style={{ color: 'var(--text)', textDecoration: 'none' }}
                    >
                      {p.translations[0]?.title || p.slug}
                    </Link>
                    <div
                      className="dim"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, marginTop: 2 }}
                    >
                      {p.slug}
                    </div>
                  </td>
                  <td>{p.authorName}</td>
                  <td>
                    <span className={statusPill(p.status)}>{m.statusLabels[p.status]}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {p.updatedAt.toISOString().slice(0, 10)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {p.publishedAt ? p.publishedAt.toISOString().slice(0, 10) : dict.common.dash}
                  </td>
                  <td>
                    <Link
                      href={`/super-admin/cms/blog/${p.id}/preview`}
                      className="btn btn-ghost btn-sm"
                    >
                      <Eye size={14} strokeWidth={1.75} />
                      {t('preview')}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
