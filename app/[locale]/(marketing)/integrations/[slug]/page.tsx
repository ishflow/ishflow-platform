import { CtaStrip } from '@/components/app/marketing/cta-strip';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ADDON_KEYS, findAddonByHrefSlug, getAddonEntry } from '@/platform/addons/catalog';
import { getAddonLabels } from '@/platform/addons/catalog-i18n';
import { Link } from '@/platform/i18n/navigation';
import { routing } from '@/platform/i18n/routing';
import { loadSection } from '@/platform/marketing/load-section';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type { CtaStripContent } from '@/platform/marketing/types';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Barcode,
  Building2,
  FileSignature,
  FileText,
  Landmark,
  type LucideIcon,
  MessageCircleQuestion,
  Printer,
  QrCode,
  ScanText,
  Send,
  ShoppingCart,
  UsersRound,
} from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const ICONS: Record<string, LucideIcon> = {
  'scan-text': ScanText,
  landmark: Landmark,
  printer: Printer,
  'qr-code': QrCode,
  'file-signature': FileSignature,
  'file-text': FileText,
  send: Send,
  barcode: Barcode,
  'shopping-cart': ShoppingCart,
  'building-2': Building2,
  'users-round': UsersRound,
  'message-circle-question': MessageCircleQuestion,
  banknote: Banknote,
};

export function generateStaticParams() {
  return ADDON_KEYS.map((key) => ({
    slug: getAddonEntry(key).navHref.replace('/addons/', ''),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = findAddonByHrefSlug(slug);
  if (!entry) return {};
  const labels = getAddonLabels(entry.key, locale);
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: `${labels.title} — ishflow`,
    description: labels.description,
    alternates: {
      canonical: `${siteUrl}/${locale}/integrations/${slug}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${siteUrl}/${l}/integrations/${slug}`]),
      ),
    },
    openGraph: {
      title: labels.title,
      description: labels.description,
      url: `${siteUrl}/${locale}/integrations/${slug}`,
      images: [`${siteUrl}/api/og?title=${encodeURIComponent(labels.title)}`],
    },
  };
}

export default async function AddonDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const entry = findAddonByHrefSlug(slug);
  if (!entry) notFound();

  const labels = getAddonLabels(entry.key, locale);
  const t = await getTranslations({ locale, namespace: 'marketing.addonDetail' });
  const cta = await loadSection<CtaStripContent>('home', 'cta', locale);
  const Icon = ICONS[entry.iconKey] ?? ScanText;

  const statusLabel: Record<typeof entry.status, string> = {
    ga: t('statusGa'),
    beta: t('statusBeta'),
    planned: t('statusPlanned'),
  };
  const statusCls: Record<typeof entry.status, string> = {
    ga: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    beta: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    planned: 'bg-muted text-muted-foreground',
  };

  return (
    <>
      <section className="px-4 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/addons"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t('backToOverview')}
          </Link>

          <div className="mt-6 inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
            <Icon className="size-6" />
          </div>
          <div className="mt-4">
            <Badge variant="secondary" className={statusCls[entry.status]}>
              {statusLabel[entry.status]}
            </Badge>
          </div>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {labels.title}
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-muted-foreground sm:text-lg">
            {labels.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-up" className={cn(buttonVariants({ size: 'lg' }), 'group')}>
              {t('startFree')}
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/contact" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
              {t('talkToSales')}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {[t('h1.title'), t('h2.title'), t('h3.title'), t('h4.title')].map((title, idx) => (
            <Card key={title} className="border-border/60 bg-card/60">
              <CardContent className="flex flex-col gap-2 p-6">
                <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                <p className="text-sm text-muted-foreground">{t(`h${idx + 1}.body`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {cta && <CtaStrip content={cta} />}
    </>
  );
}
