'use client';

import { defaultLocale } from '@/platform/i18n/config';
import { useLocale } from 'next-intl';
import type { ReactNode } from 'react';

/**
 * Onboarding → app entry link.
 *
 * Uses a plain `<a>` (full document navigation) on purpose: entering the app
 * from onboarding is a context-defining transition (the user's tenant +
 * membership were just created). A client-side soft navigation reuses the
 * cached, tenant-less `(app)` layout/shell from the onboarding render, which
 * is why the sidebar appeared missing until a manual refresh. A hard load
 * re-runs the layout server-side so the shell renders with the new tenant.
 *
 * Locale: with next-intl `localePrefix: 'as-needed'`, the default locale (ru)
 * is unprefixed, others are prefixed.
 */
export function EnterAppLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  const href = locale === defaultLocale ? '/dashboard' : `/${locale}/dashboard`;
  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}
