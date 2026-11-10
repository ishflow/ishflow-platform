'use client';

import { LanguageSwitcher } from '@/components/app/language-switcher';
import { ThemeSwitcher } from '@/components/app/theme-switcher';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Link, usePathname } from '@/platform/i18n/navigation';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface MarketingNavProps {
  signedIn: boolean;
}

export function MarketingNav({ signedIn }: MarketingNavProps) {
  const t = useTranslations('marketing.nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a trigger, not used in body
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navLinks: { label: string; href: string }[] = [
    { label: t('features'), href: '/features' },
    { label: t('pricing'), href: '/pricing' },
    { label: t('addons'), href: '/integrations' },
    { label: t('blog'), href: '/blog' },
    { label: t('about'), href: '/about' },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-transparent transition-all',
        scrolled
          ? 'border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60'
          : 'bg-background/60 backdrop-blur-sm',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold tracking-tight"
            aria-label="ishflow home"
          >
            <span
              aria-hidden
              className="inline-flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs font-bold"
            >
              1C
            </span>
            <span className="hidden sm:inline">ishflow</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground',
                    active && 'text-foreground',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
          {signedIn ? (
            <Link href="/dashboard" className={buttonVariants({ size: 'sm', variant: 'default' })}>
              {t('openApp')}
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
                {tCommon('signIn')}
              </Link>
              <Link href="/sign-up" className={buttonVariants({ size: 'sm', variant: 'default' })}>
                {t('startFree')}
              </Link>
            </>
          )}
        </div>

        <div className="flex lg:hidden items-center gap-1">
          <ThemeSwitcher />
          <LanguageSwitcher />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="right" className="w-[280px]">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="mt-8 flex flex-col gap-1 text-base">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2.5 hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-4 border-t pt-4 flex flex-col gap-2 px-1">
                  {signedIn ? (
                    <Link
                      href="/dashboard"
                      className={buttonVariants({ size: 'sm', variant: 'default' })}
                    >
                      {t('openApp')}
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/sign-in"
                        className={buttonVariants({ size: 'sm', variant: 'outline' })}
                      >
                        {tCommon('signIn')}
                      </Link>
                      <Link
                        href="/sign-up"
                        className={buttonVariants({ size: 'sm', variant: 'default' })}
                      >
                        {t('startFree')}
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
