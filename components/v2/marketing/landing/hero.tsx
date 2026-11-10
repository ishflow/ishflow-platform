import { ArrowRight, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function V2LandingHero() {
  const t = await getTranslations('v2_marketing.landing');

  return (
    <section className="hero container">
      <span className="eyebrow">
        <Zap size={13} strokeWidth={2} />
        {t('eyebrow')}
      </span>
      <h1>
        {t('headlineLine1')}
        <br />
        {t('headlineLine2')}
        <span className="sub">{t('sub')}</span>
      </h1>
      <p className="lead">{t('lead')}</p>
      <div className="cta-row">
        <Link className="btn btn-primary" href="/sign-up">
          {t('ctaPrimary')}
          <ArrowRight size={16} strokeWidth={2} />
        </Link>
        <Link className="btn btn-secondary" href="/pricing">
          {t('ctaSecondary')}
        </Link>
      </div>
      <div className="micro">{t('micro')}</div>
    </section>
  );
}
