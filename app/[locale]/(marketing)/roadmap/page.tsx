import { BlogPostRenderer } from '@/components/app/marketing/blog-post-renderer';
import { BreadcrumbJsonLd } from '@/components/app/marketing/breadcrumb-json-ld';
import { PageHead } from '@/components/app/marketing/page-head';
import { routing } from '@/platform/i18n/routing';
import { loadSection } from '@/platform/marketing/load-section';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type { MarkdownContent } from '@/platform/marketing/types';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketing.meta.roadmap' });
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}/roadmap`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl}/${l}/roadmap`])),
    },
  };
}

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [body, t] = await Promise.all([
    loadSection<MarkdownContent>('roadmap', 'body', locale),
    getTranslations({ locale, namespace: 'marketing.meta.roadmap' }),
  ]);
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: `/${locale}` },
          { name: 'Roadmap', href: `/${locale}/roadmap` },
        ]}
      />
      <PageHead eyebrow="What is next" headline="Roadmap" lede={t('description')} />
      <section className="py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {body && <BlogPostRenderer body={body.body} />}
      </section>
    </>
  );
}
