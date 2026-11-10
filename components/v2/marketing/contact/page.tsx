import { Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function V2ContactPage() {
  const t = await getTranslations('v2_marketing.contact');
  return (
    <main className="public-main container">
      <div className="page-head">
        <div className="eyebrow">{t('eyebrow')}</div>
        <h1>{t('title')}</h1>
        <p className="lead">{t('lead')}</p>
      </div>

      <div className="contact-tiles">
        <div className="contact-tile">
          <div className="glyph">
            <Mail size={20} strokeWidth={1.75} />
          </div>
          <h3>E-posta</h3>
          <p>Genel sorular ve demo talepleri.</p>
          <Link href="mailto:hello@ishflow.com">hello@ishflow.com</Link>
        </div>
        <div className="contact-tile">
          <div className="glyph">
            <Sparkles size={20} strokeWidth={1.75} />
          </div>
          <h3>Destek</h3>
          <p>Pro+ müşterileri için 24 saat içinde yanıt.</p>
          <Link href="mailto:support@ishflow.com">support@ishflow.com</Link>
        </div>
        <div className="contact-tile">
          <div className="glyph">
            <ShieldCheck size={20} strokeWidth={1.75} />
          </div>
          <h3>Güvenlik</h3>
          <p>Sorumlu açıklama programı, CVE ve raporlar.</p>
          <Link href="mailto:security@ishflow.com">security@ishflow.com</Link>
        </div>
      </div>

      <div className="contact-grid">
        <div className="contact-card">
          <h3>Bir mesaj bırak</h3>
          <p className="lead" style={{ marginBottom: 18 }}>
            İlk yanıt 24 saat içinde. Hafta sonu pazartesi sabahına kayar.
          </p>
          <form>
            <div className="form-row">
              <label htmlFor="contact-name">Adınız</label>
              <input id="contact-name" type="text" placeholder="Adınız soyadınız" />
            </div>
            <div className="form-row">
              <label htmlFor="contact-email">E-posta</label>
              <input id="contact-email" type="email" placeholder="siz@ornek.com" />
            </div>
            <div className="form-row">
              <label htmlFor="contact-msg">Mesaj</label>
              <textarea id="contact-msg" placeholder="Konunuzu kısaca anlatın..." />
            </div>
            <button className="btn btn-primary" type="submit" disabled>
              Gönder
            </button>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-dim)',
                marginTop: 10,
                textAlign: 'center',
              }}
            >
              Göndererek{' '}
              <Link href="/privacy" style={{ color: 'var(--text)', textDecoration: 'underline' }}>
                gizlilik politikamızı
              </Link>{' '}
              kabul etmiş olursun.
            </p>
          </form>
        </div>
        <div className="info-card">
          <div className="info-item">
            <strong>Bişkek</strong>
            <p>Manas Avenue 16, 5. kat — KGZ</p>
          </div>
          <div className="info-item">
            <strong>İstanbul</strong>
            <p>Bağdat Caddesi 312, kat 2 — TUR</p>
          </div>
          <div className="info-item">
            <strong>Çalışma saatleri</strong>
            <p>Pzt-Cum 09:00–18:00 (GMT+6)</p>
          </div>
        </div>
      </div>
    </main>
  );
}
