import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

type PriceTypeKey = 'list' | 'wholesale' | 'dealer' | 'promo' | 'cost';

// Brand-led palette: primary list price gets the brand blue, wholesale a
// darker brand family tone, dealer/promo retain semantic green/orange so
// five overlapping lines stay distinguishable, cost stays muted as the
// baseline reference.
const COLORS: Record<PriceTypeKey, string> = {
  list: '#0F5EEF',
  wholesale: '#0A2540',
  dealer: '#10b981',
  promo: '#f59e0b',
  cost: 'var(--text-dim)',
};

const LABELS: Record<PriceTypeKey, string> = {
  list: 'Liste',
  wholesale: 'Toptan',
  dealer: 'Bayi',
  promo: 'Promosyon',
  cost: 'Maliyet',
};

type ChangeRow = {
  date: string;
  type: PriceTypeKey;
  oldValue: string;
  newValue: string;
  delta: string;
  deltaTone: 'success' | 'warning' | 'danger';
  changedBy: string;
  reason: string;
};

const ROWS: ChangeRow[] = [
  {
    date: '12 May 2026',
    type: 'list',
    oldValue: '$1,280.00',
    newValue: '$1,300.00',
    delta: '+1.6%',
    deltaTone: 'success',
    changedBy: 'Dev User',
    reason: 'Q2 fiyat güncellemesi',
  },
  {
    date: '5 May 2026',
    type: 'dealer',
    oldValue: '$1,140.00',
    newValue: '$1,150.00',
    delta: '+0.9%',
    deltaTone: 'success',
    changedBy: 'Dev User',
    reason: 'Toplu güncelleme',
  },
  {
    date: '20 Nis 2026',
    type: 'wholesale',
    oldValue: '$1,210.00',
    newValue: '$1,220.00',
    delta: '+0.8%',
    deltaTone: 'success',
    changedBy: 'Sistem',
    reason: 'Maliyet zammı (auto)',
  },
  {
    date: '15 Nis 2026',
    type: 'cost',
    oldValue: '$1,072.00',
    newValue: '$1,100.00',
    delta: '+2.6%',
    deltaTone: 'warning',
    changedBy: '1C Köprü',
    reason: 'VATAN-001 yeni fiyat listesi',
  },
  {
    date: '2 Nis 2026',
    type: 'promo',
    oldValue: '$1,140.00',
    newValue: '$1,080.00',
    delta: '−5.3%',
    deltaTone: 'danger',
    changedBy: 'Selin K.',
    reason: 'Bahar kampanyası',
  },
  {
    date: '25 Mar 2026',
    type: 'list',
    oldValue: '$1,260.00',
    newValue: '$1,280.00',
    delta: '+1.6%',
    deltaTone: 'success',
    changedBy: 'Dev User',
    reason: 'Q1 güncelleme',
  },
  {
    date: '10 Mar 2026',
    type: 'wholesale',
    oldValue: '$1,180.00',
    newValue: '$1,210.00',
    delta: '+2.5%',
    deltaTone: 'success',
    changedBy: 'Dev User',
    reason: 'Manuel düzeltme',
  },
  {
    date: '15 Şub 2026',
    type: 'dealer',
    oldValue: '$1,120.00',
    newValue: '$1,140.00',
    delta: '+1.8%',
    deltaTone: 'success',
    changedBy: 'Sistem',
    reason: 'Maliyet+%5 kuralı (auto)',
  },
  {
    date: '2 Şub 2026',
    type: 'cost',
    oldValue: '$1,040.00',
    newValue: '$1,072.00',
    delta: '+3.1%',
    deltaTone: 'warning',
    changedBy: '1C Köprü',
    reason: 'USD/TRY kur değişimi',
  },
  {
    date: '1 Oca 2026',
    type: 'list',
    oldValue: '$1,240.00',
    newValue: '$1,260.00',
    delta: '+1.6%',
    deltaTone: 'success',
    changedBy: 'Dev User',
    reason: 'Yıl başı zammı',
  },
];

export function ProductPriceHistory() {
  return (
    <>
      <section className="card" style={{ padding: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div>
            <div className="card-title">Fiyat türü hareketleri</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Son 12 ay · USD
            </div>
          </div>
          <div className="legend">
            {(Object.keys(LABELS) as PriceTypeKey[]).map((k) => (
              <span key={k}>
                <span className="dot" style={{ background: COLORS[k] }} />
                {LABELS[k]}
              </span>
            ))}
          </div>
        </div>
        <div className="chart-wrap" style={{ height: 280, paddingLeft: 38, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 36,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--text-dim)',
              textAlign: 'right',
              paddingRight: 6,
            }}
          >
            <span>$1.4K</span>
            <span>$1.3K</span>
            <span>$1.2K</span>
            <span>$1.1K</span>
            <span>$1.0K</span>
            <span>$900</span>
          </div>
          <svg
            className="chart-svg"
            viewBox="0 0 800 240"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
          >
            <title>Fiyat geçmişi grafiği</title>
            <g stroke="var(--divider)" strokeWidth="1" strokeDasharray="2 2">
              <line x1="0" y1="0" x2="800" y2="0" />
              <line x1="0" y1="48" x2="800" y2="48" />
              <line x1="0" y1="96" x2="800" y2="96" />
              <line x1="0" y1="144" x2="800" y2="144" />
              <line x1="0" y1="192" x2="800" y2="192" />
              <line x1="0" y1="240" x2="800" y2="240" />
            </g>
            <path
              d="M0,40 L66,40 L66,30 L150,30 L240,20 L330,20 L420,20 L510,12 L600,12 L690,4 L800,4"
              fill="none"
              stroke={COLORS.list}
              strokeWidth="2.5"
            />
            <path
              d="M0,80 L66,80 L66,72 L150,72 L240,60 L330,60 L420,56 L510,50 L600,50 L690,48 L800,48"
              fill="none"
              stroke={COLORS.wholesale}
              strokeWidth="2.5"
            />
            <path
              d="M0,120 L66,120 L150,116 L240,108 L330,108 L420,98 L510,94 L600,94 L690,90 L800,90"
              fill="none"
              stroke={COLORS.dealer}
              strokeWidth="2.5"
            />
            <path
              d="M0,158 L66,150 L150,150 L240,140 L330,160 L420,148 L510,144 L510,170 L600,170 L690,138 L800,138"
              fill="none"
              stroke={COLORS.promo}
              strokeWidth="2.5"
            />
            <path
              d="M0,180 L66,180 L150,178 L240,170 L330,168 L420,164 L510,160 L600,156 L690,156 L800,154"
              fill="none"
              stroke={COLORS.cost}
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <g fill={COLORS.list}>
              <circle cx="66" cy="30" r="3" />
              <circle cx="240" cy="20" r="3" />
              <circle cx="510" cy="12" r="3" />
              <circle cx="690" cy="4" r="3" />
            </g>
          </svg>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--text-dim)',
              marginTop: 6,
            }}
          >
            <span>Haz 25</span>
            <span>Tem</span>
            <span>Ağu</span>
            <span>Eyl</span>
            <span>Eki</span>
            <span>Kas</span>
            <span>Ara</span>
            <span>Oca 26</span>
            <span>Şub</span>
            <span>Mar</span>
            <span>Nis</span>
            <span>May</span>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="table-card">
        <div className="table-toolbar">
          <div className="left">
            <strong style={{ fontSize: 14 }}>Değişim kayıtları</strong>
            <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 12 }}>
              14 değişim
            </span>
          </div>
          <div className="right">
            <button type="button" className="btn btn-secondary btn-sm">
              <Download size={14} strokeWidth={1.75} />
              CSV
            </button>
          </div>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Fiyat türü</th>
              <th className="num">Eski değer</th>
              <th className="num">Yeni değer</th>
              <th className="num">Δ</th>
              <th>Değiştiren</th>
              <th>Sebep</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={`${r.date}-${r.type}-${i}`}>
                <td>{r.date}</td>
                <td>
                  <span className="price-dot" style={{ background: COLORS[r.type] }} />
                  {LABELS[r.type]}
                </td>
                <td className="num">{r.oldValue}</td>
                <td className="num">{r.newValue}</td>
                <td className="num">
                  <span className={`pill pill-${r.deltaTone}`}>{r.delta}</span>
                </td>
                <td>{r.changedBy}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <div>1–10 / 14 gösteriliyor</div>
          <div className="pager">
            <span className="pg">
              <ChevronLeft size={12} strokeWidth={1.75} />
            </span>
            <span className="pg is-active">1</span>
            <span className="pg">2</span>
            <span className="pg">
              <ChevronRight size={12} strokeWidth={1.75} />
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
