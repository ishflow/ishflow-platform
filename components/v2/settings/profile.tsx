'use client';

import { AlertOctagon, LogOut, Save, Upload } from 'lucide-react';
import Link from 'next/link';

export function V2Profile() {
  return (
    <>
      <div className="profile-avatar">
        <div className="pic">DU</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Dev User</div>
          <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
            Sample Trading · Sahip · 12 May 2026'dan beri
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" type="button">
          <Upload size={14} strokeWidth={1.75} />
          Fotoğraf değiştir
        </button>
        <Link href="/settings/sessions" className="btn btn-secondary btn-sm">
          <LogOut size={14} strokeWidth={1.75} />
          Tüm oturumları kapat
        </Link>
      </div>

      <div className="spacer" />

      <div className="action-bar">
        <div className="left">
          <button className="btn btn-primary" type="button">
            <Save size={16} strokeWidth={1.75} />
            Değişiklikleri kaydet
          </button>
          <button className="btn btn-ghost" type="button">
            İptal
          </button>
        </div>
        <div className="right">Son güncelleme: 12 May 2026, 09:14</div>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Kişisel bilgiler</div>
        </div>
        <div className="form-grid">
          <label htmlFor="fn">Ad</label>
          <div className="field">
            <input id="fn" className="input" defaultValue="Dev" />
          </div>
          <label htmlFor="ln">Soyad</label>
          <div className="field">
            <input id="ln" className="input" defaultValue="User" />
          </div>
          <label htmlFor="dn">Görünen ad</label>
          <div className="field">
            <input id="dn" className="input" defaultValue="Dev User" />
          </div>
          <label htmlFor="em">E-posta</label>
          <div className="field">
            <input id="em" className="input" defaultValue="owner@example.com" disabled />
            <div className="field-hint">E-posta değiştirmek için destek ile iletişime geç.</div>
          </div>
          <label htmlFor="ph">Telefon</label>
          <div className="field">
            <input id="ph" className="input mono" defaultValue="+90 555 123 4567" />
          </div>
          <label htmlFor="lng">Tercih edilen dil</label>
          <div className="field">
            <select id="lng" className="select" defaultValue="tr">
              <option value="ru">Русский (RU)</option>
              <option value="en">English (EN)</option>
              <option value="tr">Türkçe (TR)</option>
              <option value="uz">O'zbek (UZ)</option>
              <option value="ky">Кыргызча (KY)</option>
            </select>
          </div>
          <label htmlFor="role">Rolün</label>
          <div className="field">
            <select id="role" className="select" disabled>
              <option>Sahip (Owner)</option>
            </select>
            <div className="field-hint">
              Rol değişikliği için Yönetim → Üyeler bölümünden istek aç.
            </div>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Güvenlik</div>
        </div>
        <div className="form-grid">
          <div className="form-label">Şifre</div>
          <div className="field" style={{ display: 'flex', gap: 8 }}>
            <input className="input mono" value="••••••••••••" readOnly style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-sm" type="button">
              Şifre değiştir
            </button>
          </div>
          <div className="form-label">İki adımlı doğrulama (2FA)</div>
          <div className="field">
            <div className="nf-row" style={{ padding: 0, borderTop: 0 }}>
              <div className="meta">
                <div className="name">Authenticator uygulaması</div>
                <div className="desc">
                  Google Authenticator / 1Password ile kod tabanlı doğrulama.
                </div>
              </div>
              <span className="tog is-on" />
            </div>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card danger-zone">
        <div className="card-header">
          <div className="card-title" style={{ color: 'var(--danger-text)' }}>
            Hesabımı sil
          </div>
        </div>
        <div className="danger-row">
          <div>
            <div className="name">ishflow hesabını kalıcı olarak sil</div>
            <div className="desc">
              Tüm çalışma alanlarından çıkarılırsın. 30 gün içinde geri alabilirsin.
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
