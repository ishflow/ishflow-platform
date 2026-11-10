import { CtaStrip } from '@/components/app/marketing/cta-strip';
import { FadeIn } from '@/components/app/marketing/fade-in';
import { PageHead } from '@/components/app/marketing/page-head';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ADDON_KEYS, getAddonEntry } from '@/platform/addons/catalog';
import { getAddonLabels } from '@/platform/addons/catalog-i18n';
import { Link } from '@/platform/i18n/navigation';
import { routing } from '@/platform/i18n/routing';
import { loadSection } from '@/platform/marketing/load-section';
import { getSiteUrl } from '@/platform/marketing/site-url';
import type { CtaStripContent } from '@/platform/marketing/types';
import {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketing.meta.addons' });
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}/integrations`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${siteUrl}/${l}/integrations`]),
      ),
    },
  };
}

export default async function AddonsOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'marketing.addonsPage' });
  const cta = await loadSection<CtaStripContent>('home', 'cta', locale);

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} headline={t('headline')} lede={t('body')} />

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADDON_KEYS.map((key, idx) => {
            const entry = getAddonEntry(key);
            const labels = getAddonLabels(key, locale);
            const Icon = ICONS[entry.iconKey] ?? ScanText;
            const slug = entry.navHref.replace('/addons/', '');
            return (
              <FadeIn key={key} delay={Math.min(idx * 0.03, 0.3)}>
                <Link href={`/integrations/${slug}`} className="group block h-full">
                  <Card className="h-full border-border/60 bg-card/60 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
                    <CardContent className="flex h-full flex-col gap-3 p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                          <Icon className="size-5" />
                        </div>
                        <StatusBadge status={entry.status} />
                      </div>
                      <h2 className="text-base font-semibold tracking-tight">{labels.title}</h2>
                      <p className="text-sm text-muted-foreground">{labels.description}</p>
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

function StatusBadge({ status }: { status: 'ga' | 'beta' | 'planned' }) {
  const variant: Record<'ga' | 'beta' | 'planned', { label: string; cls: string }> = {
    ga: { label: 'GA', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    beta: { label: 'Beta', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    planned: { label: 'Soon', cls: 'bg-muted text-muted-foreground' },
  };
  const v = variant[status];
  return (
    <Badge variant="secondary" className={v.cls}>
      {v.label}
    </Badge>
  );
}
