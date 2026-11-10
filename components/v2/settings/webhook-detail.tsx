'use client';

import { Check, Copy, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

const EVENTS: Array<{ key: string; desc: string; on: boolean }> = [
  { key: 'invoice.created', desc: 'Satış faturası oluştu', on: true },
  { key: 'invoice.posted', desc: 'Fatura post edildi', on: true },
  { key: 'invoice.cancelled', desc: 'Fatura iptal edildi', on: true },
  { key: 'payment.received', desc: 'Tahsilat geldi', on: true },
  { key: 'stock.low', desc: 'Stok kritik seviyede', on: true },
  { key: 'user.invited', desc: 'Üye davet edildi', on: true },
  { key: 'purchase.posted', desc: 'Alış faturası post', on: false },
  { key: 'payment.sent', desc: 'Giden ödeme', on: false },
  { key: 'customer.created', desc: 'Yeni müşteri', on: false },
  { key: 'customer.updated', desc: 'Müşteri güncellendi', on: false },
  { key: 'product.created', desc: 'Yeni ürün', on: false },
  { key: 'price.changed', desc: 'Fiyat değişti', on: false },
  { key: 'period.closed', desc: 'Dönem kilitlendi', on: false },
  { key: 'backup.completed', desc: 'Yedekleme bitti', on: false },
  { key: 'audit.alert', desc: 'Şüpheli olay', on: false },
];

const HISTORY = [
  { id: '1', event: 'invoice.posted', when: '2 dk önce', status: 200, ms: 184 },
  { id: '2', event: 'payment.received', when: '11 dk önce', status: 200, ms: 122 },
  { id: '3', event: 'invoice.posted', when: '2 saat önce', status: 200, ms: 96 },
  { id: '4', event: 'invoice.created', when: 'Bugün 09:12', status: 502, ms: 5012 },
  { id: '5', event: 'stock.low', when: 'Dün 22:40', status: 200, ms: 88 },
];

export function V2WebhookDetail({ id }: { id: string }) {
  const [reveal, setReveal] = useState(false);
  return (
    <>
      <div className="action-bar">
        <div className="left">
          <button className="btn btn-primary" type="button">
            <Check size={16} strokeWidth={1.75} />
            Kaydet
          </button>
          <button className="btn btn-ghost" type="button">
            İptal
          </button>
        </div>
        <div className="right">
          <button className="btn btn-danger btn-sm" type="button">
            <Trash2 size={14} strokeWidth={1.75} />
            Endpoint'i sil
          </button>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Endpoint #{id}</div>
        </div>
        <div className="form-grid">
          <label htmlFor="hook-url">URL</label>
          <div className="field">
            <input
              id="hook-url"
              className="input mono"
              defaultValue="https://api.sample-trading.com/hooks/ishflow"
            />
          </div>
          <label htmlFor="hook-secret">İmzalama anahtarı</label>
          <div className="field">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="hook-secret"
                className="input mono"
                type={reveal ? 'text' : 'password'}
                defaultValue="whsec_••••••••••••••••••••••••a8f2"
                readOnly
              />
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                aria-label={reveal ? 'Gizle' : 'Göster'}
                onClick={() => setReveal((v) => !v)}
              >
                {reveal ? (
                  <EyeOff size={14} strokeWidth={1.75} />
                ) : (
                  <Eye size={14} strokeWidth={1.75} />
                )}
              </button>
              <button className="btn btn-secondary btn-sm" type="button">
                <RefreshCw size={14} strokeWidth={1.75} />
                Yenile
              </button>
            </div>
          </div>
          <label htmlFor="hook-label">Etiket</label>
          <div className="field">
            <input id="hook-label" className="input" defaultValue="sample-trading-prod" />
          </div>
          <label htmlFor="hook-retry">Yeniden deneme</label>
          <div className="field">
            <select id="hook-retry" className="select">
              <option>5 deneme (varsayılan)</option>
              <option>10 deneme</option>
              <option>Yeniden deneme yok</option>
            </select>
          </div>
          <label htmlFor="hook-tout">Timeout</label>
          <div className="field">
            <select id="hook-tout" className="select">
              <option>10 sn (varsayılan)</option>
              <option>30 sn</option>
              <option>60 sn</option>
            </select>
          </div>
          <label htmlFor="hook-env">Ortam</label>
          <div className="field">
            <select id="hook-env" className="select">
              <option>Production</option>
              <option>Staging</option>
              <option>Dev</option>
            </select>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Abone olunan olaylar</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {EVENTS.filter((e) => e.on).length} / {EVENTS.length}
          </span>
        </div>
        <div className="ev-grid">
          {EVENTS.map((e) => (
            <label key={e.key} className={`ev-check${e.on ? ' is-on' : ''}`}>
              <input type="checkbox" defaultChecked={e.on} />
              <div>
                <div className="nm">{e.key}</div>
                <div className="ds">{e.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Son teslimatlar</div>
          <button className="btn btn-secondary btn-sm" type="button">
            <RefreshCw size={14} strokeWidth={1.75} />
            Test gönder
          </button>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Olay</th>
              <th>Zaman</th>
              <th className="num">Durum</th>
              <th className="num">Süre</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((h) => (
              <tr key={h.id}>
                <td className="mono">{h.event}</td>
                <td>{h.when}</td>
                <td className="num">
                  <span className={`pill pill-${h.status < 300 ? 'success' : 'danger'}`}>
                    {h.status}
                  </span>
                </td>
                <td className="num mono">{h.ms} ms</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-sm" type="button" aria-label="Kopyala">
                    <Copy size={14} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
