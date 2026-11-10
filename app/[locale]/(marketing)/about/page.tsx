import { BlogPostRenderer } from '@/components/app/marketing/blog-post-renderer';
import { BreadcrumbJsonLd } from '@/components/app/marketing/breadcrumb-json-ld';
import { CtaStrip } from '@/components/app/marketing/cta-strip';
import { PageHead } from '@/components/app/marketing/page-head';
import { routing } from '@/platform/i18n/routing';
import { loadSection } from '@/platform/marketing/load-section';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type { CtaStripContent, MarkdownContent } from '@/platform/marketing/types';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketing.meta.about' });
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}/about`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl}/${l}/about`])),
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [body, cta, t] = await Promise.all([
    loadSection<MarkdownContent>('about', 'body', locale),
    loadSection<CtaStripContent>('home', 'cta', locale),
    getTranslations({ locale, namespace: 'marketing.meta.about' }),
  ]);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: `/${locale}` },
          { name: 'About', href: `/${locale}/about` },
        ]}
      />
      <PageHead eyebrow="About" headline="About ishflow" lede={t('description')} />
      <section className="py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {body && <BlogPostRenderer body={body.body} />}
      </section>
      {cta && <CtaStrip content={cta} />}
    </>
  );
}
