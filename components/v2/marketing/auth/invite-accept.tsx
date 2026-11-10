import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function V2InviteAccept() {
  const t = await getTranslations('v2_marketing.auth.inviteAccept');
  const tc = await getTranslations('v2_marketing.auth.common');

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark">i</span>
        ishflow
      </div>
      <h1>{t('title')}</h1>
      <p className="auth-sub">{t('sub')}</p>

      <div className="invite-org">
        <div className="glyph">V</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t('orgName')}</div>
          <div className="role">{t('orgRole')}</div>
        </div>
      </div>

      <form>
        <div className="form-row">
          <label htmlFor="invite-email">{tc('email')}</label>
          <input id="invite-email" type="email" placeholder="you@company.com" />
        </div>
        <div className="form-row">
          <label htmlFor="invite-password">{tc('password')}</label>
          <input id="invite-password" type="password" placeholder="••••••••" />
        </div>
        <button className="btn btn-primary auth-submit" type="submit" disabled>
          {t('submit')}
        </button>
      </form>

      <div className="auth-aux">
        <Link href="/sign-in">{t('haveAccount')}</Link>
        <Link href="/contact">{t('question')}</Link>
      </div>
    </div>
  );
}
