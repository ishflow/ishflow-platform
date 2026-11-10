import { Link } from '@/platform/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { MarketingIcon, type MarketingIconName } from './icons/marketing-icons';
import { NewsletterSignup } from './newsletter-signup';

interface MarketingFooterProps {
  locale: string;
}

type FooterLink = { label: string; href: string };

const FOOTER_COLUMNS = ['product', 'resources', 'company', 'legal'] as const;
const FOOTER_SOCIALS: readonly MarketingIconName[] = ['tg', 'yt', 'linkedin', 'twitter'] as const;

export async function MarketingFooter({ locale }: MarketingFooterProps) {
  const t = await getTranslations({ locale, namespace: 'marketing.footer' });

  return (
    <footer className="mt-24 border-t border-border bg-marketing-bg-2/30">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Image
              src="/logo-light.svg"
              alt="ishflow"
              width={100}
              height={26}
              className="dark:hidden"
            />
            <Image
              src="/logo-dark.svg"
              alt="ishflow"
              width={100}
              height={26}
              className="hidden dark:block"
            />
          </div>
          <p className="max-w-xs text-sm text-marketing-fg-2">{t('tagline')}</p>
          <div className="mt-6">
            <h5 className="mb-3 text-xs uppercase tracking-[0.08em] text-marketing-fg-3">
              {t('newsletter')}
            </h5>
            <NewsletterSignup />
          </div>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <FooterCol
            key={col}
            title={t(`${col}.title`)}
            items={t.raw(`${col}.items`) as FooterLink[]}
          />
        ))}
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-marketing-fg-3 sm:px-6 lg:px-8">
          <div>
            © {new Date().getFullYear()} ishflow. {t('rights')}
          </div>
          <div className="flex items-center gap-3">
            {FOOTER_SOCIALS.map((s) => (
              <a
                key={s}
                href={t(`socials.${s}`)}
                aria-label={s}
                className="transition-colors hover:text-foreground"
              >
                <MarketingIcon name={s} size={s === 'twitter' ? 14 : 16} />
              </a>
            ))}
          </div>
          <div className="font-mono">RU · EN · TR · UZ · KY</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <div>
      <h5 className="mb-3 text-xs uppercase tracking-[0.08em] text-marketing-fg-3">{title}</h5>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="text-sm text-marketing-fg-2 transition-colors hover:text-foreground"
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
