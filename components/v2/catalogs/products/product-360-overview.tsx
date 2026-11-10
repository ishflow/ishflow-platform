import { ExternalLink } from 'lucide-react';

export function Product360Overview() {
  return (
    <>
      <section className="kpi-grid">
        <div className="kpi">
          <div className="label">Mevcut stok</div>
          <div className="value">200 adet</div>
          <div className="change up">
            <span className="pct">3 depo</span>
            <span className="note">Min: 50 · Max: 500</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Toplam satılan · YTD</div>
          <div className="value">1,284 adet</div>
          <div className="change up">
            <span className="pct">▲ 18.4%</span>
            <span className="note">$1.66M ciro</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Ortalama maliyet</div>
          <div className="value">$1,100.00</div>
          <div className="change down">
            <span className="pct">▲ 4.2%</span>
            <span className="note">Son 90 gün</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Brüt kar marjı</div>
          <div className="value">+15.4%</div>
          <div className="change up">
            <span className="pct">$200/adet</span>
            <span className="note">Liste fiyat: $1,300</span>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card sparkline-card">
        <div className="head">
          <div>
            <div className="card-title">Son 30 gün — satış & alım</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              15 Nis – 15 May 2026 · günlük
            </div>
          </div>
          <div className="legend">
            <span>
              <span className="dot" style={{ background: 'var(--accent)' }} />
              Satış
            </span>
            <span>
              <span className="dot" style={{ background: 'var(--info-text)' }} />
              Alım
            </span>
          </div>
        </div>
        <div className="chart-wrap" style={{ height: 220 }}>
          <svg
            className="chart-svg"
            viewBox="0 0 700 220"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
          >
            <title>Satış ve alım sparkline</title>
            <defs>
              <linearGradient id="v2cat-spark-1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g stroke="var(--divider)" strokeWidth="1">
              <line x1="0" y1="40" x2="700" y2="40" />
              <line x1="0" y1="100" x2="700" y2="100" />
              <line x1="0" y1="160" x2="700" y2="160" />
            </g>
            <path
              d="M0,140 L24,120 L48,135 L72,110 L96,90 L120,100 L144,80 L168,95 L192,70 L216,85 L240,60 L264,75 L288,50 L312,68 L336,55 L360,80 L384,65 L408,90 L432,72 L456,95 L480,80 L504,110 L528,90 L552,120 L576,100 L600,130 L624,115 L648,140 L672,128 L696,150 L696,220 L0,220 Z"
              fill="url(#v2cat-spark-1)"
            />
            <path
              d="M0,140 L24,120 L48,135 L72,110 L96,90 L120,100 L144,80 L168,95 L192,70 L216,85 L240,60 L264,75 L288,50 L312,68 L336,55 L360,80 L384,65 L408,90 L432,72 L456,95 L480,80 L504,110 L528,90 L552,120 L576,100 L600,130 L624,115 L648,140 L672,128 L696,150"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <path
              d="M0,170 L24,168 L48,172 L72,165 L96,160 L120,168 L144,150 L168,162 L192,148 L216,160 L240,140 L264,155 L288,135 L312,148 L336,138 L360,158 L384,142 L408,165 L432,150 L456,168 L480,155 L504,180 L528,162 L552,185 L576,170 L600,195 L624,178 L648,200 L672,188 L696,205"
              fill="none"
              stroke="var(--info-text)"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
          </svg>
        </div>
      </section>

      <div className="spacer" />

      <section className="grid-2">
        <section className="card">
          <div className="card-header">
            <div className="card-title">Top alıcılar · YTD</div>
            <button
              type="button"
              className="card-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
              }}
            >
              Tümü
              <ExternalLink size={12} strokeWidth={1.75} />
            </button>
          </div>
          {[
            { initials: 'TH', name: 'Tech Hub Istanbul', pct: 78, qty: '218 adet' },
            { initials: 'FR', name: 'Future Retail', pct: 62, qty: '172 adet' },
            { initials: 'DW', name: 'Digital World Ankara', pct: 48, qty: '134 adet' },
            { initials: 'МО', name: 'Магазин Москва', pct: 32, qty: '89 adet' },
          ].map((row) => (
            <div className="list-row" key={row.name}>
              <div className="avatar">{row.initials}</div>
              <div className="body">
                <div className="name">{row.name}</div>
                <div className="progress">
                  <div className="fill" style={{ width: `${row.pct}%` }} />
                </div>
              </div>
              <div className="num">{row.qty}</div>
            </div>
          ))}
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">Depo dağılımı</div>
            <span className="dim" style={{ fontSize: 12 }}>
              200 adet · 3 depo
            </span>
          </div>
          {[
            { initials: 'IS', name: 'Istanbul Depo', pct: 75, qty: '150 adet' },
            { initials: 'MO', name: 'Moscow Central', pct: 20, qty: '40 adet' },
            { initials: 'AN', name: 'Ankara Branch', pct: 5, qty: '10 adet' },
          ].map((row) => (
            <div className="list-row" key={row.name}>
              <div className="avatar">{row.initials}</div>
              <div className="body">
                <div className="name">{row.name}</div>
                <div className="progress">
                  <div className="fill" style={{ width: `${row.pct}%` }} />
                </div>
              </div>
              <div className="num">{row.qty}</div>
            </div>
          ))}
        </section>
      </section>
    </>
  );
}
