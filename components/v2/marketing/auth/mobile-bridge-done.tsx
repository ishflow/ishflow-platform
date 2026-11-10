import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function V2MobileBridgeDone() {
  const t = await getTranslations('v2_marketing.auth.mobileBridgeDone');

  return (
    <div className="auth-card bridge-done">
      <div className="auth-brand">
        <span className="brand-mark">i</span>
        ishflow
      </div>
      <div className="check">
        <Check size={32} strokeWidth={2} />
      </div>
      <h1>{t('title')}</h1>
      <p className="auth-sub">{t('sub')}</p>
      <Link className="btn btn-primary auth-submit" href="/">
        {t('cta')}
      </Link>
    </div>
  );
}
