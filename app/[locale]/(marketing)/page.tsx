import { AddonSpotlight } from '@/components/app/marketing/addon-spotlight';
import { CtaStrip } from '@/components/app/marketing/cta-strip';
import { FaqAccordion } from '@/components/app/marketing/faq-accordion';
import { FeatureGrid } from '@/components/app/marketing/feature-grid';
import { HeroSection } from '@/components/app/marketing/hero-section';
import { ShowcaseSection } from '@/components/app/marketing/showcase-section';
import { SocialProofStrip } from '@/components/app/marketing/social-proof-strip';
import { StatsStrip } from '@/components/app/marketing/stats-strip';
import { TestimonialStrip } from '@/components/app/marketing/testimonial-strip';
import { jsonLdSafe } from '@/lib/json-ld';
import { routing } from '@/platform/i18n/routing';
import { loadSection } from '@/platform/marketing/load-section';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type {
  AddonSpotlightContent,
  CtaStripContent,
  FaqContent,
  FeatureGridContent,
  HeroContent,
  ShowcaseContent,
  SocialProofContent,
  StatsStripContent,
  TestimonialsContent,
} from '@/platform/marketing/types';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketing.meta.home' });
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl}/${l}`])),
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${siteUrl}/${locale}`,
      siteName: 'ishflow',
      type: 'website',
      images: [`${siteUrl}/api/og?title=${encodeURIComponent(t('title'))}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  };
}

export default async function MarketingHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'marketing.home' });

  const [hero, social, stats, features, addons, showcase, testimonials, faq, cta] =
    await Promise.all([
      loadSection<HeroContent>('home', 'hero', locale),
      loadSection<SocialProofContent>('home', 'social_proof', locale),
      loadSection<StatsStripContent>('home', 'stats', locale),
      loadSection<FeatureGridContent>('home', 'feature.cards', locale),
      loadSection<AddonSpotlightContent>('home', 'addon.spotlight', locale),
      loadSection<ShowcaseContent>('home', 'showcase', locale),
      loadSection<TestimonialsContent>('home', 'testimonials', locale),
      loadSection<FaqContent>('home', 'faq', locale),
      loadSection<CtaStripContent>('home', 'cta', locale),
    ]);

  const siteUrl = getSiteUrl();

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ishflow',
    url: siteUrl,
    logo: `${siteUrl}/icon.png`,
    sameAs: [],
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ishflow',
    url: siteUrl,
  };

  const faqJsonLd = faq && {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
        dangerouslySetInnerHTML={{
          __html: jsonLdSafe([orgJsonLd, websiteJsonLd, faqJsonLd].filter(Boolean)),
        }}
      />
      {hero && <HeroSection content={hero} trustItems={t.raw('heroTrust') as string[]} />}
      {stats && <StatsStrip content={stats} />}
      {social && <SocialProofStrip content={social} />}
      {features && (
        <FeatureGrid
          content={features}
          eyebrow={t('featuresEyebrow')}
          headline={t('featuresHeadline')}
          body={t('featuresBody')}
        />
      )}
      {addons && <AddonSpotlight content={addons} locale={locale} />}
      {showcase && <ShowcaseSection content={showcase} />}
      {testimonials && (
        <TestimonialStrip
          content={testimonials}
          eyebrow={t('testimonialsEyebrow')}
          headline={t('testimonialsHeadline')}
        />
      )}
      {faq && <FaqAccordion content={faq} headline={t('faqHeadline')} body={t('faqBody')} />}
      {cta && <CtaStrip content={cta} />}
    </>
  );
}
