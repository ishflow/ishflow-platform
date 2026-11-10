import { FEATURE_SLUGS } from '@/app/[locale]/(marketing)/features/_content';
import { ADDON_KEYS, getAddonEntry } from '@/platform/addons/catalog';
import { prisma } from '@/platform/db';
import { routing } from '@/platform/i18n/routing';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type { MetadataRoute } from 'next';

const STATIC_PATHS = [
  '',
  '/pricing',
  '/features',
  '/integrations',
  '/blog',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/security',
  '/changelog',
  '/roadmap',
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const locales = routing.locales;

  const entries: MetadataRoute.Sitemap = [];

  // Static + feature + addon pages × locales
  for (const locale of locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === '' ? 'weekly' : 'monthly',
        priority: path === '' ? 1.0 : 0.7,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])),
        },
      });
    }
    for (const slug of FEATURE_SLUGS) {
      entries.push({
        url: `${siteUrl}/${locale}/features/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${siteUrl}/${l}/features/${slug}`]),
          ),
        },
      });
    }
    for (const key of ADDON_KEYS) {
      const slug = getAddonEntry(key).navHref.replace('/addons/', '');
      entries.push({
        url: `${siteUrl}/${locale}/integrations/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${siteUrl}/${l}/integrations/${slug}`]),
          ),
        },
      });
    }
  }

  // Published blog posts × locales with translations
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'published' },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
        translations: { select: { locale: true } },
      },
      take: 500,
    });
    for (const post of posts) {
      const postLocales = post.translations.map((t) => t.locale);
      for (const locale of postLocales) {
        entries.push({
          url: `${siteUrl}/${locale}/blog/${post.slug}`,
          lastModified: post.updatedAt,
          changeFrequency: 'monthly',
          priority: 0.5,
          alternates: {
            languages: Object.fromEntries(
              postLocales.map((l) => [l, `${siteUrl}/${l}/blog/${post.slug}`]),
            ),
          },
        });
      }
    }
  } catch {
    // DB unavailable — skip blog entries.
  }

  return entries;
}
