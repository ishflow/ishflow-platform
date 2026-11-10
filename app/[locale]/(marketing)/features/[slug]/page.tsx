import { BreadcrumbJsonLd } from '@/components/app/marketing/breadcrumb-json-ld';
import { CtaStrip } from '@/components/app/marketing/cta-strip';
import { FadeIn } from '@/components/app/marketing/fade-in';
import { PageHead } from '@/components/app/marketing/page-head';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link } from '@/platform/i18n/navigation';
import { routing } from '@/platform/i18n/routing';
import { loadSection } from '@/platform/marketing/load-section';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type { CtaStripContent } from '@/platform/marketing/types';
import {
  ArrowLeft,
  ArrowRight,
  FileCheck2,
  Landmark,
  type LucideIcon,
  Receipt,
  ScanText,
  Tags,
  Warehouse,
} from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { FEATURE_SLUGS, getFeatureDetail } from '../_content';

export const dynamic = 'force-dynamic';

const ICONS: Record<string, LucideIcon> = {
  receipt: Receipt,
  warehouse: Warehouse,
  tags: Tags,
  'file-check-2': FileCheck2,
  'scan-text': ScanText,
  landmark: Landmark,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const feature = getFeatureDetail(slug, locale);
  if (!feature) return {};
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: `${feature.title} — ishflow`,
    description: feature.body,
    alternates: {
      canonical: `${siteUrl}/${locale}/features/${slug}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${siteUrl}/${l}/features/${slug}`]),
      ),
    },
    openGraph: {
      title: feature.title,
      description: feature.body,
      url: `${siteUrl}/${locale}/features/${slug}`,
      siteName: 'ishflow',
      type: 'article',
      images: [`${siteUrl}/api/og?title=${encodeURIComponent(feature.title)}`],
    },
  };
}

export function generateStaticParams() {
  return FEATURE_SLUGS.map((slug) => ({ slug }));
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const feature = getFeatureDetail(slug, locale);
  if (!feature) notFound();

  const t = await getTranslations({ locale, namespace: 'marketing.featureDetail' });
  const cta = await loadSection<CtaStripContent>('home', 'cta', locale);
  const Icon = ICONS[feature.iconKey] ?? Receipt;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: `/${locale}` },
          { name: 'Features', href: `/${locale}/features` },
          { name: feature.title, href: `/${locale}/features/${slug}` },
        ]}
      />
      <section className="px-4 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/features"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t('backToOverview')}
          </Link>
        </div>
      </section>

      <PageHead eyebrow={feature.eyebrow} headline={feature.title} lede={feature.body} />

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-6" />
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/sign-up" className={cn(buttonVariants({ size: 'lg' }), 'group')}>
                {feature.cta}
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/pricing" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                {t('seePricing')}
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          {feature.highlights.map((h, idx) => (
            <FadeIn key={h.title} delay={Math.min(idx * 0.05, 0.2)}>
              <Card className="h-full border-border/60 bg-card/60">
                <CardContent className="flex h-full flex-col gap-2 p-6">
                  <h3 className="text-base font-semibold tracking-tight">{h.title}</h3>
                  <p className="text-sm text-muted-foreground">{h.body}</p>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      {cta && <CtaStrip content={cta} />}
    </>
  );
}
