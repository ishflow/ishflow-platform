import { SignIn } from '@clerk/nextjs';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { auroraAuthElements } from './clerk-appearance';

type V2SignInFormProps = {
  locale: string;
};

export async function V2SignInForm({ locale }: V2SignInFormProps) {
  const t = await getTranslations('v2_marketing.auth.signIn');

  // Locale-aware post-sign-in redirects. New users land on the workspace
  // onboarding wizard (Faz 1); returning users (with tenant) land on the V2
  // dashboard — the V2 layout guard absorbs the missing-tenant case.
  //
  // Sign-in goes via the /launch interstitial (outside the `(app)` route group)
  // rather than straight to /dashboard: Clerk navigates with the Next router
  // (soft nav), and a shared layout isn't re-rendered on soft nav, so going
  // directly to /dashboard kept the sign-in-time "no shell" layout. /launch
  // hard-navigates to the dashboard, forcing a fresh `(app)` layout render so
  // the sidebar is always present on first load. Sign-up keeps going to
  // onboarding (which already ends in its own hard-nav interstitial).
  const afterSignIn = `/${locale}/launch`;
  const afterSignUp = `/${locale}/onboarding/welcome`;

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark">i</span>
        ishflow
      </div>
      <h1>{t('title')}</h1>
      <p className="auth-sub">{t('sub')}</p>

      <SignIn
        fallbackRedirectUrl={afterSignIn}
        signUpFallbackRedirectUrl={afterSignUp}
        appearance={{ elements: auroraAuthElements }}
      />

      <p style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center', marginTop: 18 }}>
        {t.rich('legal', {
          terms: (chunks) => (
            <Link href="/terms" style={{ color: 'var(--text)', textDecoration: 'underline' }}>
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" style={{ color: 'var(--text)', textDecoration: 'underline' }}>
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
