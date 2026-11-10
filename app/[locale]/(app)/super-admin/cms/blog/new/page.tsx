import { createBlogPostV2 } from '@/app/[locale]/(app)/super-admin/cms/_actions';
import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { Link } from '@/platform/i18n/navigation';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  fontSize: 13.5,
} as const;

export default async function SaCmsBlogNewPage() {
  const t = await getTranslations('v2_super_admin.cms.blogNew');
  const dict = await getSaMarketingDict();
  const m = dict.marketing.blog;

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={t('title')}
          subtitle={t('subtitle')}
          actions={
            <Link href="/super-admin/cms/blog" className="btn btn-secondary btn-sm">
              {m.edit.backToList}
            </Link>
          }
        />
      }
    >
      <SaTenantSection title={t('meta.title')}>
        <form
          action={createBlogPostV2}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.new.slug}</span>
            <input
              name="slug"
              required
              maxLength={120}
              placeholder="my-blog-post"
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
            />
            <span className="dim" style={{ fontSize: 11.5 }}>
              {m.new.slugHint}
            </span>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.new.authorName}</span>
            <input name="authorName" required maxLength={200} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.new.tags}</span>
            <input name="tags" placeholder="release, feature" style={inputStyle} />
            <span className="dim" style={{ fontSize: 11.5 }}>
              {m.new.tagsHint}
            </span>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.new.heroImageUrl}</span>
            <input name="heroImageUrl" placeholder="https://" style={inputStyle} />
          </label>
          <div>
            <button type="submit" className="btn btn-primary btn-sm">
              {m.new.create}
            </button>
          </div>
        </form>
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
