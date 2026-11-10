'use client';

import { Save, Send } from 'lucide-react';
import { useState } from 'react';

type Tpl = { id: string; name: string; desc: string; on: boolean; group: string };

const TEMPLATES: Tpl[] = [
  {
    id: 'invoice-sent',
    name: 'invoice-sent',
    desc: 'Müşteriye fatura gönderildi',
    on: true,
    group: 'İşlem bildirimleri',
  },
  {
    id: 'payment-received',
    name: 'payment-received',
    desc: 'Ödeme alındı bildirimi',
    on: true,
    group: 'İşlem bildirimleri',
  },
  {
    id: 'invoice-overdue',
    name: 'invoice-overdue',
    desc: 'Vade geçti hatırlatma',
    on: true,
    group: 'İşlem bildirimleri',
  },
  {
    id: 'stock-low',
    name: 'stock-low',
    desc: 'Stok kritik seviyenin altında',
    on: false,
    group: 'İşlem bildirimleri',
  },
  {
    id: 'trial-ending',
    name: 'trial-ending',
    desc: 'Deneme süresi bitiyor',
    on: true,
    group: 'Sistem & abonelik',
  },
  {
    id: 'payment-failed',
    name: 'payment-failed',
    desc: 'Stripe ödeme başarısız',
    on: true,
    group: 'Sistem & abonelik',
  },
  {
    id: 'invoice-receipt',
    name: 'invoice-receipt',
    desc: 'Abonelik fatura makbuzu',
    on: true,
    group: 'Sistem & abonelik',
  },
  { id: 'invite', name: 'invite', desc: 'Yeni üye daveti', on: true, group: 'Takım daveti' },
  {
    id: 'invite-reminder',
    name: 'invite-reminder',
    desc: 'Davet hatırlatma (3g)',
    on: false,
    group: 'Takım daveti',
  },
  {
    id: 'role-changed',
    name: 'role-changed',
    desc: 'Rol değişikliği bildirimi',
    on: false,
    group: 'Takım daveti',
  },
  {
    id: 'password-reset',
    name: 'password-reset',
    desc: 'Şifre sıfırlama linki',
    on: true,
    group: 'Güvenlik',
  },
  { id: '2fa-enabled', name: '2fa-enabled', desc: '2FA aktif edildi', on: true, group: 'Güvenlik' },
  {
    id: 'new-device-signin',
    name: 'new-device-signin',
    desc: 'Yeni cihazdan giriş',
    on: true,
    group: 'Güvenlik',
  },
];

const GROUPS = ['İşlem bildirimleri', 'Sistem & abonelik', 'Takım daveti', 'Güvenlik'];

const SAMPLE_BODY = `Merhaba {{customer.name}},

{{invoice.number}} numaralı faturanız hazır.

Tutar: **{{invoice.total | money}}**
Vade: {{invoice.dueDate | date}}

[Faturayı görüntüle]({{invoice.url}})

Teşekkürler,
{{tenant.name}}
`;

export function V2EmailTemplates() {
  const [activeId, setActiveId] = useState('invoice-sent');
  const active = TEMPLATES.find((t) => t.id === activeId) ?? TEMPLATES[0];
  const [body, setBody] = useState(SAMPLE_BODY);
  const [subject, setSubject] = useState('Faturanız {{invoice.number}} hazır');

  return (
    <div className="tpl-shell">
      <div className="tpl-list">
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="tpl-list-head">{g}</div>
            {TEMPLATES.filter((t) => t.group === g).map((t) => (
              <button
                type="button"
                key={t.id}
                className={`tpl-item${activeId === t.id ? ' is-active' : ''}`}
                onClick={() => setActiveId(t.id)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                <div>
                  <div className="nm">{t.name}</div>
                  <div className="ds">{t.desc}</div>
                </div>
                <span className={`st ${t.on ? 'on' : 'off'}`}>{t.on ? 'Aktif' : 'Kapalı'}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="tpl-editor">
        <div className="action-bar">
          <div className="left">
            <span style={{ fontWeight: 700, fontSize: 14 }}>{active?.name}</span>
            <span className="dim" style={{ fontSize: 12 }}>
              {active?.desc}
            </span>
          </div>
          <div className="right">
            <button className="btn btn-secondary btn-sm" type="button">
              <Send size={14} strokeWidth={1.75} />
              Test gönder
            </button>
            <button className="btn btn-primary btn-sm" type="button">
              <Save size={14} strokeWidth={1.75} />
              Kaydet
            </button>
          </div>
        </div>

        <div className="form-grid">
          <label htmlFor="tpl-subj">Konu</label>
          <div className="field">
            <input
              id="tpl-subj"
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <label htmlFor="tpl-body">Gövde (Markdown)</label>
          <div className="field">
            <textarea
              id="tpl-body"
              className="input"
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
            />
            <div className="field-hint">
              Mustache değişkenleri: customer.name, invoice.number, tenant.name
            </div>
          </div>
        </div>

        <div className="card-header" style={{ marginTop: 6 }}>
          <div className="card-title">Canlı önizleme</div>
        </div>
        <div className="tpl-preview">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{subject}</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{body}</pre>
        </div>
      </div>
    </div>
  );
}
