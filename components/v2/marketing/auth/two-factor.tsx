import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function V2TwoFactor() {
  const t = await getTranslations('v2_marketing.auth.twoFactor');

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark">i</span>
        ishflow
      </div>
      <h1>{t('title')}</h1>
      <p className="auth-sub">{t('sub')}</p>
      <div className="code-row">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional code input
          <input key={i} type="text" maxLength={1} inputMode="numeric" />
        ))}
      </div>
      <button className="btn btn-primary auth-submit" type="submit" disabled>
        {t('submit')}
      </button>
      <div className="auth-aux">
        <Link href="/sign-in">{t('back')}</Link>
        <Link href="/contact">{t('noCode')}</Link>
      </div>
    </div>
  );
}
