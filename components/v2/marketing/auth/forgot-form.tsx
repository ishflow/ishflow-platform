import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function V2ForgotForm() {
  const t = await getTranslations('v2_marketing.auth.forgot');
  const tc = await getTranslations('v2_marketing.auth.common');

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark">i</span>
        ishflow
      </div>
      <h1>{t('title')}</h1>
      <p className="auth-sub">{t('sub')}</p>
      <form>
        <div className="form-row">
          <label htmlFor="forgot-email">{tc('email')}</label>
          <input id="forgot-email" type="email" placeholder="you@company.com" />
        </div>
        <button className="btn btn-primary auth-submit" type="submit" disabled>
          {t('submit')}
        </button>
      </form>
      <div className="auth-aux">
        <Link href="/sign-in">{t('back')}</Link>
        <Link href="/contact">{t('support')}</Link>
      </div>
    </div>
  );
}
