'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

// Store links are owner-configurable; these are the canonical ishflow listings.
const APP_STORE_URL = 'https://apps.apple.com/app/ishflow';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=dev.ishflow.android';

/**
 * Mobile-browser interstitial shown by `/invite/done`. Three exits:
 *  - "Open in app": mints a deep link via `/api/invite/mobile-token` (reuses
 *    the `/sign-in/mobile/complete` token mint) and navigates to it; the
 *    native app's `handleCallback` captures the token. Falls back to
 *    "continue in browser" if the mint fails.
 *  - "Download": store listing (app not installed).
 *  - "Continue in browser": responsive web dashboard.
 */
export function InviteHandoff() {
  const t = useTranslations('invite.handoff');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function openInApp() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch('/api/invite/mobile-token', { method: 'GET' });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      const data: { deepLink?: string } = await res.json();
      if (!data.deepLink) {
        setFailed(true);
        return;
      }
      window.location.href = data.deepLink;
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex w-full max-w-sm flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button type="button" onClick={openInApp} disabled={busy}>
          {busy ? t('opening') : t('openInApp')}
        </Button>
        <a href={APP_STORE_URL} className={buttonVariants({ variant: 'outline' })}>
          {t('downloadApple')}
        </a>
        <a href={PLAY_STORE_URL} className={buttonVariants({ variant: 'outline' })}>
          {t('downloadGoogle')}
        </a>
        <a href="/dashboard" className={buttonVariants({ variant: 'ghost' })}>
          {t('continueInBrowser')}
        </a>
        {failed ? <p className="text-sm text-destructive">{t('openFailed')}</p> : null}
      </div>
    </main>
  );
}
