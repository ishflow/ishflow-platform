import { Link } from '@/platform/i18n/navigation';
import { loadSection } from '@/platform/marketing/load-section';
import type { FooterContent } from '@/platform/marketing/types';
import { getTranslations } from 'next-intl/server';
import { NewsletterSignup } from '../newsletter-signup';

interface MarketingFooterProps {
  locale: string;
}

export async function MarketingFooter({ locale }: MarketingFooterProps) {
  const t = await getTranslations({ locale, namespace: 'marketing.footer' });
  const data = await loadSection<FooterContent>('footer', 'columns', locale);
  const columns = data?.columns ?? [];
  const tagline = data?.tagline ?? t('tagline');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2 text-base font-semibold">
              <span
                aria-hidden
                className="inline-flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs font-bold"
              >
                1C
              </span>
              <span>ishflow</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">{tagline}</p>
            <div className="mt-6">
              <NewsletterSignup />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col-reverse gap-4 border-t border-border/60 pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} ishflow. {t('copyright')}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              {t('privacy')}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {t('terms')}
            </Link>
            <Link href="/security" className="hover:text-foreground">
              {t('security')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
