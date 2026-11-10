import { AlertOctagon, AlertTriangle, Download, LogOut } from 'lucide-react';

export function V2DangerZone() {
  return (
    <>
      <section className="card">
        <div className="info-banner">
          <div className="lbl">
            <AlertTriangle size={14} strokeWidth={2} />
            Bu sayfa kişisel hesabını etkiler
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
            Buradaki işlemler <b>seninle ilgili</b>. Çalışma alanının silinmesi için{' '}
            <a href="/admin/audit" style={{ color: 'var(--accent)' }}>
              Yönetim → Tehlikeli alan
            </a>
            'a git.
          </p>
        </div>
      </section>

      <div className="spacer" />

      <section className="card danger-zone">
        <div className="card-header">
          <div className="card-title">Verilerimi dışa aktar</div>
        </div>
        <div className="danger-row">
          <div>
            <div className="name">Tüm verilerimi indir (GDPR uyumlu)</div>
            <div className="desc">
              Kişisel veriler, oluşturduğun belgeler, denetim kaydındaki izlerin — JSON + CSV
              formatında. Hazırlandığında e-posta ile bildirilir (~15 dk).
            </div>
          </div>
          <button className="btn btn-secondary" type="button">
            <Download size={16} strokeWidth={1.75} />
            İndirme isteği gönder
          </button>
        </div>
      </section>

      <div className="spacer" />

      <section className="card danger-zone">
        <div className="card-header">
          <div className="card-title">Oturum & cihazlar</div>
        </div>
        <div className="danger-row">
          <div>
            <div className="name">Tüm cihazlardan çıkış yap</div>
            <div className="desc">
              Mobil + web tüm aktif oturumların sonlandırılır. Sonra tekrar giriş yapman gerekir.
            </div>
          </div>
          <button className="btn btn-secondary" type="button">
            Tüm cihazlardan çıkış
          </button>
        </div>
        <div className="danger-row">
          <div>
            <div className="name">Tüm API anahtarlarını iptal et</div>
            <div className="desc">
              Aktif 3 API anahtarın iptal olur. Entegrasyonlar çalışmayı durdurur.
            </div>
          </div>
          <button className="btn btn-secondary" type="button">
            Anahtarları iptal et
          </button>
        </div>
      </section>

      <div className="spacer" />

      <section className="card danger-zone">
        <div className="card-header">
          <div className="card-title">Çalışma alanından çık</div>
        </div>
        <div className="danger-row">
          <div>
            <div className="name">Sample Trading LLC'den ayrıl</div>
            <div className="desc">
              Bu çalışma alanına erişimini kaybedersin. Sahip rolündesin — önce başka bir
              kullanıcıyı sahip olarak atamalısın.
            </div>
          </div>
          <button className="btn btn-secondary" type="button" disabled>
            <LogOut size={16} strokeWidth={1.75} />
            Sahip olduğun için çıkamazsın
          </button>
        </div>
      </section>

      <div className="spacer" />

      <section className="card danger-zone">
        <div className="card-header">
          <div className="card-title">Hesabı kalıcı olarak sil</div>
        </div>
        <div className="danger-row">
          <div>
            <div className="name">ishflow hesabımı sil</div>
            <div className="desc">
              Tüm çalışma alanlarından çıkarılırsın. Verilerin GDPR uyarınca 30 gün
              anonimleştirilmiş şekilde saklanır, sonra silinir. Aktif Pro abonelik varsa iade
              edilmez.
            </div>
          </div>
          <button className="btn btn-danger" type="button">
            <AlertOctagon size={16} strokeWidth={1.75} />
            Hesabımı sil
          </button>
        </div>
      </section>
    </>
  );
}
