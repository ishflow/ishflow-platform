'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { setSuperAdminLocale } from '@/app/super-admin/_actions/set-locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPER_ADMIN_LOCALES, type SuperAdminLocale } from '@/platform/super-admin/i18n';

interface LanguageSwitcherProps {
  current: SuperAdminLocale;
  dict: {
    label: string;
    languages: Record<SuperAdminLocale, string>;
  };
}

/**
 * Compact locale picker rendered in the super-admin header. Persists the
 * choice via a server action and forces a refresh so RSC re-fetches strings
 * in the new language.
 */
export function LanguageSwitcher({ current, dict }: LanguageSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={current}
      onValueChange={(value) => {
        if (!value) return;
        startTransition(async () => {
          await setSuperAdminLocale(value as SuperAdminLocale);
          router.refresh();
        });
      }}
      disabled={pending}
    >
      <SelectTrigger className="h-8 w-[120px]" aria-label={dict.label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPER_ADMIN_LOCALES.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {dict.languages[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
