import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function V2TwoFactorSetup() {
  const t = await getTranslations('v2_marketing.auth.twoFactorSetup');

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark">i</span>
        ishflow
      </div>
      <h1>{t('title')}</h1>
      <p className="auth-sub">{t('sub')}</p>
      <div className="qr-box" aria-label="QR placeholder" />
      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-muted)',
          marginBottom: 16,
        }}
      >
        {t('manualLabel')} <code style={{ fontFamily: 'var(--font-mono)' }}>JBSWY3DPEHPK3PXP</code>
      </p>
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
        <Link href="/sign-in">{t('cancel')}</Link>
        <Link href="/contact">{t('help')}</Link>
      </div>
    </div>
  );
}
