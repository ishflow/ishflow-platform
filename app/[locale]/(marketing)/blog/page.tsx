import { BlogPostCard } from '@/components/app/marketing/blog-post-card';
import { FadeIn } from '@/components/app/marketing/fade-in';
import { PageHead } from '@/components/app/marketing/page-head';
import { prisma } from '@/platform/db';
import { fallbackLocale } from '@/platform/i18n/config';
import { routing } from '@/platform/i18n/routing';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketing.meta.blog' });
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}/blog`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl}/${l}/blog`])),
    },
  };
}

interface PostListItem {
  id: string;
  slug: string;
  publishedAt: Date | null;
  authorName: string;
  tags: string[];
  heroImageUrl: string | null;
  title: string;
  excerpt: string;
}

async function loadPosts(locale: string): Promise<PostListItem[]> {
  try {
    const rows = await prisma.blogPost.findMany({
      where: { status: 'published' },
      orderBy: [{ publishedAt: 'desc' }],
      take: 40,
      select: {
        id: true,
        slug: true,
        publishedAt: true,
        authorName: true,
        tags: true,
        heroImageUrl: true,
        translations: {
          select: { locale: true, title: true, excerpt: true },
        },
      },
    });

    return rows
      .map((row) => {
        const t =
          row.translations.find((x) => x.locale === locale) ??
          row.translations.find((x) => x.locale === fallbackLocale) ??
          row.translations[0];
        if (!t) return null;
        return {
          id: row.id,
          slug: row.slug,
          publishedAt: row.publishedAt,
          authorName: row.authorName,
          tags: row.tags,
          heroImageUrl: row.heroImageUrl,
          title: t.title,
          excerpt: t.excerpt,
        };
      })
      .filter((p): p is PostListItem => Boolean(p));
  } catch {
    return [];
  }
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'marketing.blog' });
  const posts = await loadPosts(locale);

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} headline={t('headline')} lede={t('body')} />

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {posts.length === 0 ? (
            <FadeIn>
              <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-16 text-center">
                <h2 className="text-lg font-semibold">{t('emptyTitle')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('emptyBody')}</p>
              </div>
            </FadeIn>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, idx) => (
                <FadeIn key={post.id} delay={Math.min(idx * 0.05, 0.3)}>
                  <BlogPostCard
                    slug={post.slug}
                    title={post.title}
                    excerpt={post.excerpt}
                    publishedAt={post.publishedAt}
                    authorName={post.authorName}
                    tags={post.tags}
                    heroImageUrl={post.heroImageUrl}
                    locale={locale}
                  />
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
