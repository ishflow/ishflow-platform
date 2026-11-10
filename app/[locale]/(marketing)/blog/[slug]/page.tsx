import { BlogPostRenderer } from '@/components/app/marketing/blog-post-renderer';
import { BreadcrumbJsonLd } from '@/components/app/marketing/breadcrumb-json-ld';
import { CtaStrip } from '@/components/app/marketing/cta-strip';
import { PageHead } from '@/components/app/marketing/page-head';
import { Badge } from '@/components/ui/badge';
import { jsonLdSafe } from '@/lib/json-ld';
import { prisma } from '@/platform/db';
import { fallbackLocale } from '@/platform/i18n/config';
import { Link } from '@/platform/i18n/navigation';
import { loadSection } from '@/platform/marketing/load-section';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type { CtaStripContent } from '@/platform/marketing/types';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PostFull {
  id: string;
  slug: string;
  publishedAt: Date | null;
  authorName: string;
  heroImageUrl: string | null;
  tags: string[];
  title: string;
  excerpt: string;
  body: string;
  locales: string[];
}

async function loadPost(slug: string, locale: string): Promise<PostFull | null> {
  try {
    const row = await prisma.blogPost.findFirst({
      where: { slug, status: 'published' },
      select: {
        id: true,
        slug: true,
        publishedAt: true,
        authorName: true,
        heroImageUrl: true,
        tags: true,
        translations: { select: { locale: true, title: true, excerpt: true, body: true } },
      },
    });
    if (!row) return null;
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
      heroImageUrl: row.heroImageUrl,
      tags: row.tags,
      title: t.title,
      excerpt: t.excerpt,
      body: t.body,
      locales: row.translations.map((x) => x.locale),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await loadPost(slug, locale);
  if (!post) return {};
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: `${post.title} — ishflow Blog`,
    description: post.excerpt,
    alternates: {
      canonical: `${siteUrl}/${locale}/blog/${slug}`,
      languages: Object.fromEntries(post.locales.map((l) => [l, `${siteUrl}/${l}/blog/${slug}`])),
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${siteUrl}/${locale}/blog/${slug}`,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.authorName],
      tags: post.tags,
      images: [post.heroImageUrl ?? `${siteUrl}/api/og?title=${encodeURIComponent(post.title)}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = await loadPost(slug, locale);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: 'marketing.blog' });
  const cta = await loadSection<CtaStripContent>('home', 'cta', locale);
  const siteUrl = getSiteUrl();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Person', name: post.authorName },
    datePublished: post.publishedAt?.toISOString(),
    image: post.heroImageUrl ?? `${siteUrl}/api/og?title=${encodeURIComponent(post.title)}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/${locale}/blog/${slug}`,
    },
  };

  const date = post.publishedAt
    ? new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(post.publishedAt)
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(articleJsonLd) }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: `/${locale}` },
          { name: 'Blog', href: `/${locale}/blog` },
          { name: post.title, href: `/${locale}/blog/${slug}` },
        ]}
      />

      <section className="px-4 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t('backToBlog')}
          </Link>
        </div>
      </section>

      <PageHead
        eyebrow={post.tags[0] ?? t('eyebrow')}
        headline={post.title}
        lede={`${post.authorName}${date ? ` · ${date}` : ''}`}
      />

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {post.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {post.heroImageUrl && (
          <img
            src={post.heroImageUrl}
            alt=""
            className="mt-8 w-full rounded-xl border border-border/60 object-cover"
          />
        )}
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <BlogPostRenderer body={post.body} />
      </section>

      {cta && <CtaStrip content={cta} />}
    </>
  );
}
