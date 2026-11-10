import { getTranslations } from 'next-intl/server';

export async function V2AboutAppInfo() {
  const t = await getTranslations('v2_marketing.about');

  return (
    <main className="public-main container">
      <section className="about-hero">
        <h1>
          {t('appHeadline')}
          <span className="sub">{t('appSub')}</span>
        </h1>
        <p className="lead">{t('appLead')}</p>
      </section>

      <section className="about-section">
        <h2>ishflow</h2>
        <div className="controls-list">
          <div className="control-row">
            <div className="control-name">Sürüm</div>
            <p>1.32.0 (build 20260518.1)</p>
          </div>
          <div className="control-row">
            <div className="control-name">Yayın kanalı</div>
            <p>Production</p>
          </div>
          <div className="control-row">
            <div className="control-name">Çalıştığı bölge</div>
            <p>EU · managed Postgres</p>
          </div>
          <div className="control-row">
            <div className="control-name">Lisans</div>
            <p>
              ishflow, kendi geliştirdiğimiz tescilli yazılımdır. Müşterilerin verileri kendi
              mülküdür.
            </p>
          </div>
          <div className="control-row">
            <div className="control-name">Açık kaynak bileşenler</div>
            <p>
              Next.js · React · Tailwind · shadcn/ui · Prisma · Postgres · Clerk · next-intl ·
              Stripe SDK · Lucide
            </p>
          </div>
          <div className="control-row">
            <div className="control-name">İletişim</div>
            <p>hello@ishflow.com · support@ishflow.com · security@ishflow.com</p>
          </div>
        </div>
      </section>
    </main>
  );
}
