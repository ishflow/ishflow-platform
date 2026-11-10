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
  const t = await getTranslations({ locale, namespace: 'marketing.meta.security' });
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}/security`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl}/${l}/security`])),
    },
  };
}

export default async function SecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [body, t] = await Promise.all([
    loadSection<MarkdownContent>('security', 'body', locale),
    getTranslations({ locale, namespace: 'marketing.meta.security' }),
  ]);
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: `/${locale}` },
          { name: 'Security', href: `/${locale}/security` },
        ]}
      />
      <PageHead eyebrow="Trust" headline="Security" lede={t('description')} />
      <section className="py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {body && <BlogPostRenderer body={body.body} />}
      </section>
    </>
  );
}
