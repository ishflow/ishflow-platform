import { CtaStrip } from '@/components/app/marketing/cta-strip';
import { FadeIn } from '@/components/app/marketing/fade-in';
import { PageHead } from '@/components/app/marketing/page-head';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@/platform/i18n/navigation';
import { routing } from '@/platform/i18n/routing';
import { loadSection } from '@/platform/marketing/load-section';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type { CtaStripContent } from '@/platform/marketing/types';
import {
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
import { listFeatures } from './_content';

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
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketing.meta.features' });
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}/features`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl}/${l}/features`])),
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${siteUrl}/${locale}/features`,
      siteName: 'ishflow',
      type: 'website',
    },
  };
}

export default async function FeaturesOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'marketing.featuresPage' });
  const features = listFeatures(locale);
  const cta = await loadSection<CtaStripContent>('home', 'cta', locale);

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} headline={t('headline')} lede={t('body')} />

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, idx) => {
            const Icon = ICONS[f.iconKey] ?? Receipt;
            return (
              <FadeIn key={f.slug} delay={Math.min(idx * 0.05, 0.3)}>
                <Link href={`/features/${f.slug}`} className="group block h-full">
                  <Card className="h-full border-border/60 bg-card/60 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
                    <CardContent className="flex h-full flex-col gap-4 p-6">
                      <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {f.eyebrow}
                      </div>
                      <h2 className="text-base font-semibold tracking-tight">{f.title}</h2>
                      <p className="flex-1 text-sm text-muted-foreground">{f.body}</p>
                      <div className="flex items-center gap-1 text-sm font-medium text-primary">
                        <span>{t('learnMore')}</span>
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {cta && <CtaStrip content={cta} />}
    </>
  );
}
