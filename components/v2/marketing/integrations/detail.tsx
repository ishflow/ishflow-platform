import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function V2IntegrationDetail() {
  const t = await getTranslations('v2_marketing.integrations');
  return (
    <>
      <div className="container back-row">
        <Link className="back-link" href="/integrations">
          <ArrowLeft size={14} strokeWidth={2} />
          {t('backLink')}
        </Link>
      </div>

      <section className="page-head container">
        <span className="eyebrow">Muhasebe · Hazır</span>
        <h1>1C migration</h1>
        <p className="lead">
          1C:Enterprise XML ihracını ishflow'a sürükle. Sihirbaz, kataloglarını, müşterilerini ve
          açık bakiyelerini iki tıkla eşleştirir.
        </p>
      </section>

      <section className="hero-block container">
        <div className="hero-icon">
          <span style={{ fontWeight: 800, fontSize: 18 }}>1C</span>
        </div>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/sign-up">
            Ücretsiz başla
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
          <Link className="btn btn-secondary" href="/contact">
            {t('demo')}
          </Link>
        </div>
      </section>

      <section className="container">
        <div className="highlights">
          <article className="highlight-card">
            <div className="ico">
              <Check size={20} strokeWidth={1.75} />
            </div>
            <h3>XML ihracını sürükle</h3>
            <p>
              1C 8.x'in standart konfigürasyon ihracını destekler. Ek script gerekmez; sihirbaz
              hangi dosyayı beklediğini anlatır.
            </p>
          </article>
          <article className="highlight-card">
            <div className="ico">
              <Check size={20} strokeWidth={1.75} />
            </div>
            <h3>Eşleştirme önizleme</h3>
            <p>
              Her ürün, müşteri ve tedarikçi için eşleşme önizleme açılır. Belirsizler "manuel
              karar" listesine düşer.
            </p>
          </article>
          <article className="highlight-card">
            <div className="ico">
              <Check size={20} strokeWidth={1.75} />
            </div>
            <h3>Açık bakiyeler</h3>
            <p>
              Stok bakiyeleri, alacak ve borç hareketleri tek bir kayıt belgesiyle ishflow'a
              taşınır; rollback edilebilir.
            </p>
          </article>
          <article className="highlight-card">
            <div className="ico">
              <Check size={20} strokeWidth={1.75} />
            </div>
            <h3>Audit log</h3>
            <p>
              Tüm migration adımları audit kaydına işlenir. Gerekirse "geri al" butonu tüm import'u
              tek transaction içinde silebilir.
            </p>
          </article>
        </div>
      </section>

      <section className="container">
        <div className="cta-strip">
          <h2>İlk migration ücretsiz.</h2>
          <p>Free plan kullanıcıları da bir kez 1C XML'i denemeye davetli.</p>
          <div className="actions">
            <Link className="btn btn-primary" href="/sign-up">
              Hesap aç
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
            <Link className="btn btn-secondary" href="/contact">
              Bize ulaş
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
