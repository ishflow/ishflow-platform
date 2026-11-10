'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { localeFlags, localeLabels, locales } from '@/platform/i18n/config';
import { usePathname, useRouter } from '@/platform/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const onSelect = (next: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: next as (typeof locales)[number] });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" disabled={pending}>
            <span className="mr-1">{localeFlags[currentLocale as (typeof locales)[number]]}</span>
            {localeLabels[currentLocale as (typeof locales)[number]]}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {locales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onClick={() => onSelect(loc)}
              aria-current={loc === currentLocale ? 'true' : undefined}
            >
              <span className="mr-2">{localeFlags[loc]}</span>
              {localeLabels[loc]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
