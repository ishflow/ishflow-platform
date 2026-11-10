'use client';

import { defaultLocale } from '@/platform/i18n/config';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Post-sign-in interstitial. Clerk's `<SignIn>` navigates to its redirect URL
 * with the Next.js router (a soft, client-side navigation), and Next.js does
 * NOT re-render a shared layout on soft nav — so going straight from /sign-in
 * to /dashboard kept the sign-in-time "no chrome" `(app)` layout render and the
 * sidebar never appeared until a manual refresh.
 *
 * This screen does a full-page `window.location` navigation to the dashboard,
 * forcing the `(app)` layout to re-render from scratch so the shell (rail +
 * panel) is always present on the first dashboard render. It lives under
 * `(auth-public)`, so it inherits the Aurora auth surface (glass card + glow).
 */
export function LaunchRedirect({ locale, message }: { locale: string; message: string }) {
  useEffect(() => {
    const href = locale === defaultLocale ? '/dashboard' : `/${locale}/dashboard`;
    window.location.replace(href);
  }, [locale]);

  return (
    <div className="auth-card launch-card" aria-live="polite">
      <div className="launch-brand">
        <img
          className="launch-logo launch-logo--light"
          src="/favicon-light.svg"
          alt="ishflow"
          width={43}
          height={48}
        />
        <img
          className="launch-logo launch-logo--dark"
          src="/favicon-dark.svg"
          alt="ishflow"
          width={43}
          height={48}
        />
      </div>
      <div className="launch-status">
        <Loader2 size={18} className="animate-spin launch-spinner" />
        <span>{message}</span>
      </div>
    </div>
  );
}
