import { ArrowRight, Check, Download, FileText, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export function V2BankImportOutput() {
  return (
    <>
      <div className="step-indicator">
        <span className="dot" /> Yükle
        <span style={{ flex: 1, height: 1, background: 'var(--accent)' }} />
        <span className="dot" /> Hesaplar
        <span style={{ flex: 1, height: 1, background: 'var(--accent)' }} />
        <span className="dot is-active" /> Çıktı
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>3 / 3</span>
      </div>

      <section className="card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 4,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: 'var(--success-soft)',
              color: 'var(--success-text)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Check size={28} strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>İçe aktarma tamamlandı</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              134 satır işlendi · 118 ödeme/tahsilat oluşturuldu · 14 satır atlandı · 2 satır manuel
              onay bekliyor.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" type="button">
            <Download size={14} strokeWidth={1.75} />
            Sonuç CSV
          </button>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Oluşturulan belgeler</div>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>#</th>
              <th>Belge tipi</th>
              <th>Cari</th>
              <th>Tarih</th>
              <th className="num">Tutar</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="mono">PMT-2026-0241</td>
              <td>Tahsilat</td>
              <td>Tech Hub İstanbul Ltd.</td>
              <td>14/05/2026</td>
              <td className="num mono">+₺12,400.00</td>
              <td>
                <span className="pill pill-success">Post edildi</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <Link href="/documents/sales-invoice" className="btn btn-ghost btn-sm">
                  Aç
                </Link>
              </td>
            </tr>
            <tr>
              <td className="mono">PMT-2026-0240</td>
              <td>Tahsilat</td>
              <td>Digital World Ankara</td>
              <td>13/05/2026</td>
              <td className="num mono">+₺8,220.00</td>
              <td>
                <span className="pill pill-success">Post edildi</span>
              </td>
              <td />
            </tr>
            <tr>
              <td className="mono">PAY-2026-0118</td>
              <td>Ödeme</td>
              <td>Vatan Bilgisayar Ltd.</td>
              <td>15/05/2026</td>
              <td className="num mono">-₺52,140.00</td>
              <td>
                <span className="pill pill-success">Post edildi</span>
              </td>
              <td />
            </tr>
            <tr>
              <td
                className="mono"
                colSpan={6}
                style={{ textAlign: 'center', padding: '14px 0', color: 'var(--text-muted)' }}
              >
                + 115 belge daha
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </section>

      <div className="spacer" />

      <section className="card" style={{ borderColor: 'var(--warning-soft)' }}>
        <div className="card-header">
          <div className="card-title" style={{ color: 'var(--warning-text)' }}>
            Manuel onay bekleyen
          </div>
          <span className="pill pill-warning">2 satır</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 10 }}>
          Bu satırların eşleşmesi belirsiz. Açıp onaylaman gerekiyor — aksi halde içe aktarma
          tamamlanmaz.
        </p>
        <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
          <li>
            <FileText size={12} strokeWidth={1.75} style={{ verticalAlign: 'middle' }} /> SAMSUNG
            WHOLESALE · ₺18,900.50 · 2 olası fatura
          </li>
          <li>
            <FileText size={12} strokeWidth={1.75} style={{ verticalAlign: 'middle' }} /> ACME
            SUPPLY CO. · ₺6,863.31 · referans eşleşiyor, tutar farklı
          </li>
        </ul>
      </section>

      <div className="spacer" />

      <div className="action-bar">
        <div className="left">
          <Link href="/addons/bank-import" className="btn btn-ghost">
            <ArrowRight size={14} strokeWidth={1.75} />
            Eklenti anasayfası
          </Link>
        </div>
        <div className="right">
          <button className="btn btn-secondary btn-sm" type="button">
            <RefreshCw size={14} strokeWidth={1.75} />
            Yeniden çalıştır
          </button>
          <Link href="/addons/bank-import/upload" className="btn btn-primary btn-sm">
            Yeni içe aktarma
          </Link>
        </div>
      </div>
    </>
  );
}
