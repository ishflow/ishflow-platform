'use client';

import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Method = {
  id: string;
  brand: 'VISA' | 'MC' | 'AMEX';
  last4: string;
  expiry: string;
  default?: boolean;
};

const INITIAL: Method[] = [
  { id: '1', brand: 'VISA', last4: '4242', expiry: '12/2027', default: true },
  { id: '2', brand: 'MC', last4: '8821', expiry: '03/2026' },
];

export function V2PaymentMethods() {
  const [methods, setMethods] = useState(INITIAL);

  return (
    <>
      <div className="action-bar">
        <div className="left">
          <button className="btn btn-primary" type="button">
            <Plus size={16} strokeWidth={1.75} />
            Yeni kart ekle
          </button>
        </div>
        <div className="right dim">Kart bilgileri Stripe'ta tokenize edilir, ishflow saklamaz.</div>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Kayıtlı ödeme yöntemleri</div>
        </div>
        {methods.map((m) => (
          <div key={m.id} className="pm-row">
            <div className="brand">{m.brand}</div>
            <div className="num">•••• •••• •••• {m.last4}</div>
            <div className="dim" style={{ fontSize: 12 }}>
              {m.expiry}
            </div>
            {m.default ? (
              <span className="pill pill-success">Varsayılan</span>
            ) : (
              <button className="btn btn-ghost btn-sm" type="button">
                Varsayılan yap
              </button>
            )}
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              aria-label="Sil"
              onClick={() => setMethods((ms) => ms.filter((x) => x.id !== m.id))}
              disabled={m.default}
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Yeni kart ekle</div>
          <span className="dim" style={{ fontSize: 12 }}>
            Stripe Elements form'una yönlendireceğiz
          </span>
        </div>
        <div className="form-grid">
          <label htmlFor="pm-name">Kart sahibi</label>
          <div className="field">
            <input id="pm-name" className="input" placeholder="Dev User" />
          </div>
          <label htmlFor="pm-num">Kart numarası</label>
          <div className="field">
            <input id="pm-num" className="input mono" placeholder="4242 4242 4242 4242" />
          </div>
          <label htmlFor="pm-exp">Son kullanma</label>
          <div className="field">
            <input id="pm-exp" className="input mono" placeholder="MM/YY" />
          </div>
          <label htmlFor="pm-cvc">CVC</label>
          <div className="field">
            <input id="pm-cvc" className="input mono" placeholder="123" />
          </div>
        </div>
        <div className="action-bar" style={{ marginTop: 14 }}>
          <div className="left">
            <button className="btn btn-primary" type="button">
              <CreditCard size={16} strokeWidth={1.75} />
              Kartı kaydet
            </button>
            <button className="btn btn-ghost" type="button">
              İptal
            </button>
          </div>
          <div className="right dim">Test ortamında 4242 4242 4242 4242 kullan</div>
        </div>
      </section>
    </>
  );
}
