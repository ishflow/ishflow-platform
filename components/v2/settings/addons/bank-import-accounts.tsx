'use client';

import { ChevronLeft, Plus, Upload } from 'lucide-react';
import Link from 'next/link';

type Map = { src: string; target: string; status: 'mapped' | 'create' | 'skip' };
const MAPS: Map[] = [
  { src: 'VATAN BILGISAYAR LTD', target: 'Vatan Bilgisayar Ltd. Şti.', status: 'mapped' },
  { src: 'SAMSUNG WHOLESALE', target: 'Samsung Electronics TR A.Ş.', status: 'mapped' },
  { src: 'TECH HUB ISTANBUL', target: 'Tech Hub İstanbul Ltd.', status: 'mapped' },
  { src: 'FUTURE RETAIL', target: '— Yeni cari oluştur —', status: 'create' },
  { src: 'DIGITAL WORLD ANKARA', target: 'Digital World Ankara', status: 'mapped' },
  { src: 'ELEKTRIK FATURASI · BEDAŞ', target: 'Boğaziçi Elektrik (BEDAŞ)', status: 'mapped' },
  { src: 'MAVI ELEKTRONIK', target: 'Mavi Elektronik San. Tic.', status: 'mapped' },
  { src: 'GLOBEX DISTRIBUTION', target: 'Globex Distribution Inc.', status: 'mapped' },
  { src: 'FAIZ TAHSILATI', target: '— Atla (banka geliri) —', status: 'skip' },
  { src: 'ACME SUPPLY CO.', target: 'Acme Supply Co.', status: 'mapped' },
];

export function V2BankImportAccounts() {
  return (
    <>
      <div className="step-indicator">
        <span className="dot" /> Yükle
        <span style={{ flex: 1, height: 1, background: 'var(--accent)' }} />
        <span className="dot is-active" /> Hesaplar
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span className="dot" /> Çıktı
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>2 / 3</span>
      </div>

      <div className="action-bar">
        <div className="left">
          <Link href="/addons/bank-import/upload" className="btn btn-secondary">
            <ChevronLeft size={14} strokeWidth={1.75} />
            Önceki adım
          </Link>
        </div>
        <div className="right">
          {MAPS.filter((m) => m.status === 'mapped').length} eşleşti ·{' '}
          {MAPS.filter((m) => m.status === 'create').length} yeni cari ·{' '}
          {MAPS.filter((m) => m.status === 'skip').length} atlandı
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Karşı taraf eşleme</div>
          <span className="dim" style={{ fontSize: 12 }}>
            Banka açıklaması → ishflow carisi
          </span>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Banka açıklaması</th>
              <th>ishflow carisi</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {MAPS.map((m) => (
              <tr key={m.src}>
                <td className="mono">{m.src}</td>
                <td>
                  <select className="select" defaultValue={m.target}>
                    <option>{m.target}</option>
                    <option>— Yeni cari oluştur —</option>
                    <option>— Atla —</option>
                  </select>
                </td>
                <td>
                  {m.status === 'mapped' ? (
                    <span className="pill pill-success">Eşlendi</span>
                  ) : m.status === 'create' ? (
                    <span className="pill pill-info">
                      <Plus size={10} strokeWidth={2.5} /> Yeni
                    </span>
                  ) : (
                    <span className="pill pill-neutral">Atla</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-sm" type="button">
                    Detay
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Otomasyon kuralı kaydet</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 10 }}>
          Bu eşleştirmeleri "HSBC TR · KOBİ Vadesiz" hesabı için kaydet — bir sonraki içe aktarmada
          otomatik uygulansın.
        </p>
        <div className="nf-row" style={{ borderTop: 0, padding: 0 }}>
          <div className="meta">
            <div className="name">Kuralları hatırla</div>
            <div className="desc">Aynı açıklama gelirse soru sormadan eşle.</div>
          </div>
          <span className="tog is-on" />
        </div>
      </section>

      <div className="spacer" />

      <div className="action-bar">
        <div className="left">
          <Link href="/addons/bank-import" className="btn btn-ghost">
            İptal
          </Link>
        </div>
        <div className="right">
          <Link href="/addons/bank-import/output" className="btn btn-primary">
            <Upload size={14} strokeWidth={1.75} />
            İçe aktarmayı çalıştır
          </Link>
        </div>
      </div>
    </>
  );
}
