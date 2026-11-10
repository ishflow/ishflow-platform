'use client';

import { ChevronLeft, FolderOpen, Save, Upload, UploadCloud } from 'lucide-react';
import Link from 'next/link';

const PREVIEW_ROWS = [
  {
    date: '15/05/2026',
    desc: 'VATAN BILGISAYAR LTD',
    amount: '-₺52,140.00',
    iban: 'TR98 0006 ...0042',
    ref: 'INVOICE-000012',
    match: { tone: 'success' as const, text: 'Auto · faturayı kapatır' },
  },
  {
    date: '15/05/2026',
    desc: 'SAMSUNG WHOLESALE',
    amount: '-₺18,900.50',
    iban: 'TR12 0006 ...0099',
    ref: 'SI-2026-114',
    match: { tone: 'warning' as const, text: 'Şüpheli · 2 eşleşme' },
  },
  {
    date: '14/05/2026',
    desc: 'TECH HUB ISTANBUL',
    amount: '+₺12,400.00',
    iban: 'TR45 0006 ...1180',
    ref: 'RCV-005',
    match: { tone: 'success' as const, text: 'Auto · tahsilat' },
  },
  {
    date: '14/05/2026',
    desc: 'EFT GIDEN — FUTURE RETAIL',
    amount: '-₺3,200.00',
    iban: 'TR67 0006 ...0250',
    ref: '—',
    match: { tone: 'neutral' as const, text: 'Eşleşme yok' },
  },
  {
    date: '13/05/2026',
    desc: 'DIGITAL WORLD ANKARA',
    amount: '+₺8,220.00',
    iban: 'TR89 0006 ...0660',
    ref: 'INV-024',
    match: { tone: 'success' as const, text: 'Auto · tahsilat' },
  },
  {
    date: '13/05/2026',
    desc: 'ELEKTRIK FATURASI · BEDAŞ',
    amount: '-₺1,420.10',
    iban: 'TR22 0001 ...0501',
    ref: '2026/04/BD',
    match: { tone: 'neutral' as const, text: 'Eşleşme yok' },
  },
  {
    date: '12/05/2026',
    desc: 'MAVI ELEKTRONIK',
    amount: '+₺3,900.00',
    iban: 'TR55 0006 ...0090',
    ref: 'INVOICE-000008',
    match: { tone: 'success' as const, text: 'Auto · tahsilat' },
  },
  {
    date: '12/05/2026',
    desc: 'GLOBEX DISTRIBUTION',
    amount: '+₺12,204.00',
    iban: 'TR91 0006 ...0411',
    ref: 'INVOICE-000007',
    match: { tone: 'success' as const, text: 'Auto · tahsilat' },
  },
  {
    date: '11/05/2026',
    desc: 'FAIZ TAHSILATI',
    amount: '+₺182.30',
    iban: '—',
    ref: 'BSMV',
    match: { tone: 'neutral' as const, text: 'Eşleşme yok' },
  },
  {
    date: '10/05/2026',
    desc: 'ACME SUPPLY CO.',
    amount: '-₺6,863.31',
    iban: 'TR40 0006 ...0123',
    ref: 'INVOICE-000008',
    match: { tone: 'danger' as const, text: 'Mismatch' },
  },
];

export function V2BankImportUpload() {
  return (
    <>
      <div className="step-indicator">
        <span className="dot is-active" /> Yükle
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span className="dot" /> Hesaplar
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span className="dot" /> Çıktı
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>1 / 3</span>
      </div>

      <div className="action-bar">
        <div className="left">
          <Link href="/addons/bank-import" className="btn btn-secondary">
            <ChevronLeft size={14} strokeWidth={1.75} />
            Geri
          </Link>
        </div>
        <div className="right">Adım 1 / 3 · Dosya & format</div>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">1. Dosya</div>
          <span className="pill pill-success">hsbc-2026-05-16.csv yüklendi</span>
        </div>
        <div className="dropzone">
          <UploadCloud size={28} strokeWidth={1.75} />
          <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 8, color: 'var(--text)' }}>
            Dosyayı sürükle bırak veya tıkla
          </h3>
          <p>En fazla 25 MB · UTF-8 / windows-1254 · İlk satır başlık olmalı</p>
          <button className="btn btn-secondary" type="button" style={{ marginTop: 12 }}>
            <FolderOpen size={14} strokeWidth={1.75} />
            Bilgisayardan seç
          </button>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">2. Hesap & Format</div>
        </div>
        <div className="form-grid">
          <label htmlFor="bi-acc">Banka hesabı</label>
          <div className="field">
            <select id="bi-acc" className="select">
              <option>HSBC TR · KOBİ Vadesiz · ...6789 01</option>
              <option>Halyk Bank · KZ Operations</option>
              <option>Kaspi.kz · Gold business</option>
            </select>
          </div>
          <div className="form-label">Format</div>
          <div className="field">
            <div
              className="chip-row"
              style={{ background: 'transparent', border: 'none', padding: 0 }}
            >
              <button className="chip is-active" type="button">
                CSV
              </button>
              <button className="chip" type="button">
                MT940
              </button>
              <button className="chip" type="button">
                OFX / QFX
              </button>
            </div>
            <div className="field-hint">Format dosyadan otomatik algılandı.</div>
          </div>
          <label htmlFor="bi-dfmt">Tarih biçimi</label>
          <div className="field">
            <select id="bi-dfmt" className="select">
              <option>DD/MM/YYYY (16/05/2026)</option>
              <option>YYYY-MM-DD (2026-05-16)</option>
              <option>MM/DD/YYYY</option>
            </select>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">3. Önizleme · ilk 10 satır</div>
          <span className="dim" style={{ fontSize: 12 }}>
            Toplam 134 satır algılandı
          </span>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Açıklama</th>
              <th className="num">Tutar</th>
              <th>Karşı IBAN</th>
              <th>Referans</th>
              <th>Eşleşme</th>
            </tr>
          </thead>
          <tbody>
            {PREVIEW_ROWS.map((r) => (
              <tr key={r.desc + r.ref}>
                <td>{r.date}</td>
                <td>{r.desc}</td>
                <td className="num mono">{r.amount}</td>
                <td className="mono">{r.iban}</td>
                <td className="mono">{r.ref}</td>
                <td>
                  <span className={`pill pill-${r.match.tone}`}>{r.match.text}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="spacer" />

      <div className="action-bar">
        <div className="left">
          <Link href="/addons/bank-import" className="btn btn-ghost">
            İptal
          </Link>
        </div>
        <div className="right">
          <button className="btn btn-secondary" type="button">
            <Save size={14} strokeWidth={1.75} />
            Şablon olarak kaydet
          </button>
          <Link href="/addons/bank-import/accounts" className="btn btn-primary">
            <Upload size={14} strokeWidth={1.75} />
            Hesap eşleme adımı
          </Link>
        </div>
      </div>
    </>
  );
}
