'use client';

import { kyKG } from '@/lib/clerk-localizations/ky';
import { uzUZ } from '@/lib/clerk-localizations/uz';
import { deDE, frFR, ruRU, trTR, zhCN } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import type { LocalizationResource } from '@clerk/types';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

// Clerk's UI (sign-in/up, verification, error messages, user/org widgets) is localized
// separately from next-intl, via the ClerkProvider `localization` prop. `en` is Clerk's
// built-in default (no entry). ru/tr/de/fr/zh ship with @clerk/localizations; uz/ky are
// custom (translated from enUS). Unknown locales fall back to English.
const CLERK_LOCALIZATIONS: Record<string, LocalizationResource> = {
  ru: ruRU,
  tr: trTR,
  de: deDE,
  fr: frFR,
  zh: zhCN,
  uz: uzUZ,
  ky: kyKG,
};

export function ClerkThemeProvider({
  locale,
  children,
}: {
  locale?: string;
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Brand the embedded Clerk widgets (sign-in/up, verification, user/org) to
  // match the Aurora-glass auth surface: ishflow blue primary + pill-ish radius
  // so inputs/buttons blend with the frosted card. `baseTheme: dark` flips the
  // widget palette in dark mode. Per-page `appearance` (transparent card,
  // hidden header) is merged on top of this by the individual forms.
  const appearance = {
    ...(mounted && resolvedTheme === 'dark' ? { baseTheme: dark } : {}),
    variables: {
      colorPrimary: '#0f5eef',
      borderRadius: '13px',
    },
  };
  const localization = locale ? CLERK_LOCALIZATIONS[locale] : undefined;
  return (
    <ClerkProvider appearance={appearance} localization={localization}>
      {children}
    </ClerkProvider>
  );
}
