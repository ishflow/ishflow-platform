import { ContactForm } from '@/components/app/marketing/contact-form';
import { PageHead } from '@/components/app/marketing/page-head';
import { routing } from '@/platform/i18n/routing';
import { getSiteUrl } from '@/platform/marketing/site-url';
import { Mail, MapPin, MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketing.meta.contact' });
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}/contact`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl}/${l}/contact`])),
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'marketing.contactPage' });

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} headline={t('headline')} lede={t('body')} />

      <section className="py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_2fr]">
            <div>
              <dl className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 size-4 text-primary" />
                  <div>
                    <dt className="font-medium">{t('emailLabel')}</dt>
                    <dd>
                      <a
                        href="mailto:hello@ishflow.com"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        hello@ishflow.com
                      </a>
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MessageCircle className="mt-0.5 size-4 text-primary" />
                  <div>
                    <dt className="font-medium">{t('supportLabel')}</dt>
                    <dd>
                      <a
                        href="mailto:support@ishflow.com"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        support@ishflow.com
                      </a>
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 text-primary" />
                  <div>
                    <dt className="font-medium">{t('addressLabel')}</dt>
                    <dd className="text-muted-foreground">{t('address')}</dd>
                  </div>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-10">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
