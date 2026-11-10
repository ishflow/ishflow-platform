import { SignUp } from '@clerk/nextjs';
import { getTranslations } from 'next-intl/server';
import { auroraAuthElements } from './clerk-appearance';

type V2SignUpFormProps = {
  locale: string;
};

export async function V2SignUpForm({ locale }: V2SignUpFormProps) {
  const t = await getTranslations('v2_marketing.auth.signUp');

  // Locale-aware post-sign-up landing: send new accounts straight into the
  // workspace onboarding wizard so they end up with a real tenant + owner
  // membership before they hit any tenant-scoped route.
  const afterSignUp = `/${locale}/onboarding/welcome`;

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark">i</span>
        ishflow
      </div>
      <h1>{t('title')}</h1>
      <p className="auth-sub">{t('sub')}</p>

      <SignUp
        fallbackRedirectUrl={afterSignUp}
        signInUrl={`/${locale}/sign-in`}
        appearance={{ elements: auroraAuthElements }}
      />
    </div>
  );
}
