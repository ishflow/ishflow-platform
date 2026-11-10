import { AddonSpotlight } from '@/components/app/marketing/addon-spotlight';
import { FaqAccordion } from '@/components/app/marketing/faq-accordion';
import { PageHead } from '@/components/app/marketing/page-head';
import { ComparisonTable } from '@/components/app/marketing/pricing/comparison-table';
import { PricingMobileFallback } from '@/components/app/marketing/pricing/pricing-mobile-fallback';
import { routing } from '@/platform/i18n/routing';
import { loadSection } from '@/platform/marketing/load-section';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type {
  AddonSpotlightContent,
  FaqContent,
  PricingComparisonContent,
  PricingTableContent,
} from '@/platform/marketing/types';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PricingClient } from './pricing-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketing.meta.pricing' });
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}/pricing`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl}/${l}/pricing`])),
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${siteUrl}/${locale}/pricing`,
      siteName: 'ishflow',
      type: 'website',
      images: [`${siteUrl}/api/og?title=${encodeURIComponent(t('title'))}`],
    },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'marketing.pricing' });
  const [table, comparison, addons, faq] = await Promise.all([
    loadSection<PricingTableContent>('pricing', 'table', locale),
    loadSection<PricingComparisonContent>('pricing', 'comparison', locale),
    loadSection<AddonSpotlightContent>('pricing', 'addons', locale),
    loadSection<FaqContent>('pricing', 'faq', locale),
  ]);

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} headline={t('headline')} lede={t('lede')} />
      {table && (
        <section className="pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <PricingClient
              table={table}
              labelMonth={t('billingMonth')}
              labelYear={t('billingYear')}
            />
          </div>
        </section>
      )}
      {comparison && (
        <section className="pb-16">
          <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-semibold">{t('comparisonHeadline')}</h2>
            <ComparisonTable content={comparison} />
            <PricingMobileFallback content={comparison} />
          </div>
        </section>
      )}
      {addons && <AddonSpotlight content={addons} locale={locale} />}
      {faq && <FaqAccordion content={faq} headline={t('faqHeadline')} />}
    </>
  );
}
