import { BookOpen, Copy, MoreHorizontal, Plus, Zap } from 'lucide-react';
import Link from 'next/link';

const KEYS = [
  {
    name: 'production',
    key: 'isu_live_••••a8f2',
    created: '12 May 2026',
    lastUsed: '4 dk önce',
    calls: '1,402',
  },
  {
    name: 'staging',
    key: 'isu_test_••••3d11',
    created: '4 May 2026',
    lastUsed: '2 saat önce',
    calls: '320',
  },
  {
    name: 'zip-export-script',
    key: 'isu_pat_••••f021',
    created: '21 Apr 2026',
    lastUsed: 'Dün',
    calls: '78',
  },
];

const HOOKS = [
  {
    url: 'https://api.sample-trading.com/hooks/ishflow',
    label: 'sample-trading-prod',
    events: 'invoice.* · payment.received · stock.low',
    state: 'success' as const,
    stateLabel: 'Sağlıklı',
    rate: '99.7%',
  },
  {
    url: 'https://staging.sample-trading.com/hooks/ishflow',
    label: 'staging',
    events: 'invoice.* · price.changed',
    state: 'warning' as const,
    stateLabel: 'Yavaş',
    rate: '94.1%',
  },
  {
    url: 'https://make.com/abc/ishflow-feed',
    label: 'make.com',
    events: 'customer.created · product.created',
    state: 'danger' as const,
    stateLabel: '402 fail',
    rate: '72.3%',
  },
];

export function V2ApiOverview() {
  return (
    <>
      <section className="upsell-card">
        <div className="body">
          <h3>API & Webhook · Business planı</h3>
          <p>
            Public API'yi etkinleştir, sınırsız webhook endpoint'i bağla ve 10.000 çağrı/saat'e
            kadar ölçeklen. 14 günlük denemen aktif.
          </p>
        </div>
        <div className="actions">
          <Link href="/settings/billing" className="btn btn-primary">
            <Zap size={16} strokeWidth={1.75} />
            Business'a yükselt
          </Link>
          <Link href="/settings/billing" className="btn btn-ghost btn-sm">
            Karşılaştır
          </Link>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">API anahtarları</div>
          <Link href="/settings/api/tokens" className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={1.75} />
            Yeni anahtar üret
          </Link>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Anahtar</th>
              <th>Oluşturuldu</th>
              <th>Son kullanım</th>
              <th className="num">Çağrı</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {KEYS.map((k) => (
              <tr key={k.key}>
                <td>
                  <b>{k.name}</b>
                </td>
                <td className="mono">{k.key}</td>
                <td>{k.created}</td>
                <td>{k.lastUsed}</td>
                <td className="num">{k.calls}</td>
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

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Webhook endpoint'leri</div>
          <button className="btn btn-primary btn-sm" type="button">
            <Plus size={14} strokeWidth={1.75} />
            Endpoint ekle
          </button>
        </div>
        {HOOKS.map((h) => (
          <div key={h.url} className="webhook-row">
            <div className="meta">
              <div className="name">
                {h.label}
                <span className={`pill pill-${h.state}`}>{h.stateLabel}</span>
              </div>
              <div className="info mono">{h.url}</div>
              <div className="info">
                Olaylar: {h.events} · Başarı oranı <b>{h.rate}</b>
              </div>
            </div>
            <div className="actions">
              <Link
                href={`/settings/api/webhooks/${encodeURIComponent(h.label)}`}
                className="btn btn-secondary btn-sm"
              >
                Test gönder
              </Link>
              <button className="btn btn-ghost btn-sm" type="button" aria-label="Diğer">
                <MoreHorizontal size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        ))}
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Rate limiting & güvenlik</div>
        </div>
        <div className="form-grid">
          <label htmlFor="rate">Saat başı çağrı sınırı</label>
          <div className="field">
            <select id="rate" className="select">
              <option>10.000 / saat (Business)</option>
              <option>2.500 / saat (Pro)</option>
              <option>500 / saat (Starter)</option>
            </select>
          </div>
          <label htmlFor="ip">IP allowlist</label>
          <div className="field">
            <select id="ip" className="select">
              <option>Devre dışı (tüm IP'ler)</option>
              <option>Yalnızca CIDR listem</option>
            </select>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="docs-card">
        <div className="body">
          <h3>Dokümana git</h3>
          <p>OpenAPI 3.1 spesifikasyonu, kod örnekleri ve Postman koleksiyonu.</p>
        </div>
        <Link href="/settings/api" className="btn btn-primary">
          <BookOpen size={16} strokeWidth={1.75} />
          Dokümana git →
        </Link>
      </section>
    </>
  );
}
