'use client';

import { defaultLocale } from '@/platform/i18n/config';
import { Check, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';

/**
 * Onboarding → app entry with a branded "preparing your workspace" interstitial.
 *
 * Clicking the button shows a full-screen branded overlay that walks through a
 * few prep steps (~4s) and then HARD-navigates (`window.location`) to the
 * dashboard. The hard load re-runs the `(app)` layout server-side so the
 * sidebar renders with the freshly-created tenant; the brief delay also gives
 * Clerk's active-org session claim time to propagate. Replaces the bare
 * `EnterAppLink` with a slicker first-run moment.
 */
const STEPS_MS = [600, 1500, 2500] as const;
const ENTER_MS = 4000;

export function LaunchToDashboard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  const href = locale === defaultLocale ? '/dashboard' : `/${locale}/dashboard`;
  const [launching, setLaunching] = useState(false);
  const [done, setDone] = useState(0);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    if (!launching) return;
    const timers = STEPS_MS.map((ms, i) => setTimeout(() => setDone(i + 1), ms));
    const welcomeT = setTimeout(() => setWelcome(true), 3100);
    const enterT = setTimeout(() => window.location.assign(href), ENTER_MS);
    return () => {
      for (const t of timers) clearTimeout(t);
      clearTimeout(welcomeT);
      clearTimeout(enterT);
    };
  }, [launching, href]);

  const steps = [
    'Çalışma alanınız oluşturuldu',
    'Demo veriler yüklendi',
    'Modülleriniz hazırlanıyor',
  ];

  return (
    <>
      <button type="button" className={className} onClick={() => setLaunching(true)}>
        {children}
      </button>

      {launching ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#f4f6fb',
            display: 'grid',
            placeItems: 'center',
            fontFamily: '-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
          }}
        >
          <div style={{ width: 360, maxWidth: '90vw', textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: '#0F5EEF',
                color: '#fff',
                fontWeight: 800,
                fontSize: 30,
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 22px',
                fontFamily: 'Georgia, serif',
              }}
            >
              if
            </div>

            {welcome ? (
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0a1330' }}>
                Hoş geldiniz! 🎉
              </div>
            ) : (
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0a1330',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Loader2
                  size={18}
                  style={{ animation: 'if-spin 0.9s linear infinite', color: '#0F5EEF' }}
                />
                Şirketiniz hazırlanıyor…
              </div>
            )}

            <div
              style={{
                marginTop: 22,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                textAlign: 'left',
              }}
            >
              {steps.map((label, i) => {
                const ok = done > i;
                return (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      opacity: ok ? 1 : 0.45,
                      transition: 'opacity 0.4s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        background: ok ? '#0F5EEF' : '#dbe3f0',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {ok ? <Check size={13} strokeWidth={3} /> : null}
                    </span>
                    <span style={{ fontSize: 14, color: '#42506b' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <style
            // biome-ignore lint/security/noDangerouslySetInnerHtml: static keyframes
            dangerouslySetInnerHTML={{ __html: '@keyframes if-spin{to{transform:rotate(360deg)}}' }}
          />
        </div>
      ) : null}
    </>
  );
}
