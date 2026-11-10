'use client';

import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { locales } from '@/platform/i18n/config';
import { Link, usePathname, useRouter } from '@/platform/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { MarketingIcon } from './icons/marketing-icons';

type NavLink = { id: string; href: string; tk: string };

const NAV_LINKS: NavLink[] = [
  { id: 'features', href: '/features', tk: 'features' },
  { id: 'integrations', href: '/integrations', tk: 'integrations' },
  { id: 'pricing', href: '/pricing', tk: 'pricing' },
  { id: 'blog', href: '/blog', tk: 'blog' },
  { id: 'about', href: '/about', tk: 'about' },
  { id: 'contact', href: '/contact', tk: 'contact' },
];

type AppLocale = (typeof locales)[number];

const LOCALES: { code: AppLocale; label: string }[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'uz', label: 'Oʻzbekcha' },
  { code: 'ky', label: 'Кыргызча' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'zh', label: '中文' },
];

interface MarketingNavProps {
  // Retained for backwards compatibility with the existing layout wiring
  // (Wave 5 will replace the prop with `currentUser` once available). The new
  // nav shows sign-in/sign-up affordances unconditionally per design.
  signedIn?: boolean;
}

export function MarketingNav(_props: MarketingNavProps = {}) {
  const t = useTranslations('marketing.nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname change closes the mobile sheet
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  const onLocaleSelect = (next: AppLocale) => {
    router.replace(pathname ?? '/', { locale: next });
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-colors',
        scrolled
          ? 'border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70'
          : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="ishflow home">
          <Image
            src="/logo-light.svg"
            alt="ishflow"
            width={120}
            height={30}
            className="dark:hidden"
            priority
          />
          <Image
            src="/logo-dark.svg"
            alt="ishflow"
            width={120}
            height={30}
            className="hidden dark:block"
            priority
          />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.id}
              href={l.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm text-marketing-fg-2 transition-colors hover:text-foreground',
                isActive(l.href) && 'text-foreground',
              )}
            >
              {t(l.tk)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="hidden sm:inline-grid size-9 place-items-center rounded-md text-marketing-fg-2 hover:bg-marketing-bg-2 hover:text-foreground transition-colors"
            aria-label={t('theme')}
          >
            <MarketingIcon name={mounted && resolvedTheme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-mono uppercase text-marketing-fg-2 hover:bg-marketing-bg-2 hover:text-foreground transition-colors"
                  aria-label={`Locale: ${locale.toUpperCase()}`}
                >
                  <MarketingIcon name="globe" size={12} />
                  {locale.toUpperCase()}
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              {LOCALES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => onLocaleSelect(l.code)}
                  aria-current={locale === l.code ? 'true' : undefined}
                  className={cn('flex items-center gap-2', locale === l.code && 'font-medium')}
                >
                  <span className="w-6 font-mono text-[10px] text-marketing-fg-3">
                    {l.code.toUpperCase()}
                  </span>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/sign-in"
            className="hidden sm:inline-flex px-3 py-1.5 text-sm text-marketing-fg-2 transition-colors hover:text-foreground"
          >
            {t('signIn')}
          </Link>
          <Link
            href="/sign-up"
            className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex')}
          >
            {t('signUp')}
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  className="md:hidden size-9 inline-grid place-items-center rounded-md text-marketing-fg-2 hover:bg-marketing-bg-2 hover:text-foreground transition-colors"
                  aria-label={t('menu')}
                >
                  <MarketingIcon name="menu" size={18} />
                </button>
              }
            />
            <SheetContent side="right" className="w-full sm:max-w-sm">
              <SheetTitle className="sr-only">{t('menu')}</SheetTitle>
              <nav className="flex flex-col gap-1 pt-8">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.id}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-3 text-base text-foreground hover:bg-marketing-bg-2"
                  >
                    <span>{t(l.tk)}</span>
                    <MarketingIcon name="chev" size={14} />
                  </Link>
                ))}
                <div className="mt-6 flex flex-col gap-2 px-1">
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileOpen(false)}
                    className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}
                  >
                    {t('signIn')}
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={() => setMobileOpen(false)}
                    className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
                  >
                    {t('signUp')}
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
