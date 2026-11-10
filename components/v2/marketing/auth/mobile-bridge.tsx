import { Smartphone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function V2MobileBridge() {
  const t = await getTranslations('v2_marketing.auth.mobileBridge');
  const tc = await getTranslations('v2_marketing.auth.common');

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark">i</span>
        ishflow
      </div>
      <div className="bridge-illustration">
        <Smartphone size={36} strokeWidth={1.5} />
      </div>
      <h1>{t('title')}</h1>
      <p className="auth-sub">{t('sub')}</p>
      <form>
        <div className="form-row">
          <label htmlFor="bridge-email">{tc('email')}</label>
          <input id="bridge-email" type="email" placeholder="you@company.com" />
        </div>
        <div className="form-row">
          <label htmlFor="bridge-password">{tc('password')}</label>
          <input id="bridge-password" type="password" placeholder="••••••••" />
        </div>
        <button className="btn btn-primary auth-submit" type="submit" disabled>
          {t('submit')}
        </button>
      </form>
      <div className="auth-aux">
        <Link href="/sign-in">{t('webSignIn')}</Link>
        <Link href="/contact">{t('help')}</Link>
      </div>
    </div>
  );
}
