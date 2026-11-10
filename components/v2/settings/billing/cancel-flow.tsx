'use client';

import { AlertTriangle, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const REASONS = [
  { id: 'too-expensive', label: 'Çok pahalı' },
  { id: 'not-using', label: 'Yeterince kullanmıyoruz' },
  { id: 'switching', label: 'Başka bir araca geçiyoruz' },
  { id: 'missing', label: 'İhtiyacımız olan özellik yok' },
  { id: 'temporary', label: 'Geçici olarak ara veriyorum' },
  { id: 'other', label: 'Diğer' },
] as const;

export function V2CancelFlow() {
  const [reason, setReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  return (
    <>
      <div className="cancel-progress">
        <div className="step is-done">
          <span className="num">
            <Check size={12} strokeWidth={2.5} />
          </span>
          <span>Sebep</span>
        </div>
        <div className="line is-done" />
        <div className={`step${reason ? ' is-active' : ''}`}>
          <span className="num">2</span>
          <span>Teklif</span>
        </div>
        <div className="line" />
        <div className="step">
          <span className="num">3</span>
          <span>Onay</span>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">1. Bizi neden bırakıyorsun?</div>
        </div>
        <div className="form-grid">
          {REASONS.map((r) => (
            <div key={r.id} style={{ gridColumn: 'span 2' }}>
              <label
                className="ev-check"
                style={{
                  background: reason === r.id ? 'var(--accent-soft)' : 'var(--surface)',
                  borderColor: reason === r.id ? 'var(--accent)' : 'var(--divider)',
                }}
              >
                <input
                  type="radio"
                  name="reason"
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                />
                <div>
                  <div className="nm" style={{ fontFamily: 'inherit', fontWeight: 600 }}>
                    {r.label}
                  </div>
                </div>
              </label>
            </div>
          ))}
        </div>
        <textarea
          className="input"
          rows={3}
          placeholder="Birkaç kelimeyle daha açıkla (opsiyonel)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          style={{ marginTop: 14 }}
        />
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">2. Bunları biliyor muydun?</div>
        </div>
        <div className="form-grid">
          <div style={{ gridColumn: 'span 2' }}>
            <div className="info-banner">
              <div className="lbl">💡 3 ay %50 indirim</div>
              <p style={{ fontSize: 13, margin: 0, color: 'var(--text)' }}>
                Pro planında kal, gelecek 3 ay yarı fiyat. Otomatik olarak normal fiyata döner.
              </p>
            </div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div className="info-banner" style={{ background: 'var(--accent-soft)' }}>
              <div className="lbl">⏸ Geçici duraklatma</div>
              <p style={{ fontSize: 13, margin: 0, color: 'var(--text)' }}>
                Aboneliğini 14-90 gün dondur, verilerini kaybetmeden geri dönmeyi bekle.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card danger-zone">
        <div className="card-header">
          <div className="card-title" style={{ color: 'var(--danger-text)' }}>
            3. Yine de iptal et
          </div>
        </div>
        <div className="info-banner" style={{ background: 'var(--danger-soft)', marginBottom: 14 }}>
          <div className="lbl" style={{ color: 'var(--danger-text)' }}>
            <AlertTriangle size={14} strokeWidth={2} /> Aboneliğini iptal etmek üzeresin
          </div>
          <ul
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              margin: 0,
              paddingLeft: 18,
              color: 'var(--text)',
            }}
          >
            <li>12 Haziran 2026'ya kadar Pro özelliklerin açık kalır.</li>
            <li>Sonrasında otomatik olarak Free plana geçersin — verilerin kaybolmaz.</li>
            <li>Aktif tüm webhook entegrasyonların durdurulur.</li>
          </ul>
        </div>

        <label
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            fontSize: 13,
            color: 'var(--text)',
            marginBottom: 12,
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Yukarıdakileri anladım ve aboneliğimi iptal etmek istiyorum.
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Link href="/settings/billing" className="btn btn-ghost">
            Vazgeç
          </Link>
          <button className="btn btn-danger" type="button" disabled={!confirmed || !reason}>
            <ArrowRight size={16} strokeWidth={1.75} />
            Aboneliği iptal et
          </button>
        </div>
      </section>
    </>
  );
}
