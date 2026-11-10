import { Link } from '@/platform/i18n/navigation';
import {
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  TrendingUp,
} from 'lucide-react';

type Option = {
  id: 'percent' | 'fixed' | 'set' | 'cost-margin';
  icon: typeof TrendingUp;
  label: string;
  desc: string;
  active?: boolean;
};

const OPTIONS: Option[] = [
  {
    id: 'percent',
    icon: TrendingUp,
    label: '% Artış / Azalış',
    desc: 'Mevcut fiyata yüzde uygula. Örn: %+5 → $1,000 → $1,050.',
    active: true,
  },
  {
    id: 'fixed',
    icon: Plus,
    label: 'Sabit ekleme / çıkarma',
    desc: 'Mevcut fiyata sabit USD ekle. Örn: +$10 → $1,000 → $1,010.',
  },
  {
    id: 'set',
    icon: Edit3,
    label: 'Yeni sabit değer',
    desc: 'Tüm seçili ürünlere aynı fiyatı uygula. Dikkatli kullan.',
  },
  {
    id: 'cost-margin',
    icon: Calculator,
    label: 'Maliyet + marj formülü',
    desc: 'Yeni fiyat = maliyet × (1 + marj). Maliyet alanı ürün başına okunur.',
  },
];

const AFFECTED = [
  { sku: 'SKU-0001', old: '$1,300', next: '$1,364.99', delta: '+$64.99' },
  { sku: 'SKU-0002', old: '$2,220', next: '$2,330.99', delta: '+$110.99' },
  { sku: 'SKU-0003', old: '$2,499', next: '$2,623.99', delta: '+$124.99' },
  { sku: 'SKU-0006', old: '$1,799', next: '$1,888.99', delta: '+$89.99' },
  { sku: 'SKU-0008', old: '$699', next: '$733.99', delta: '+$34.99' },
  { sku: 'SKU-0014', old: '$249', next: '$261.99', delta: '+$12.99' },
  { sku: 'SKU-0023', old: '$549', next: '$576.99', delta: '+$27.99' },
  { sku: 'SKU-0041', old: '$99', next: '$103.99', delta: '+$4.99' },
];

export function BulkPriceChange() {
  return (
    <>
      <div className="stepper">
        <div className="step is-done">
          <span className="step-num">
            <Check size={11} strokeWidth={2} />
          </span>
          Fiyat türü
        </div>
        <div className="step-sep" />
        <div className="step is-active">
          <span className="step-num">2</span>
          Değişim kuralı
        </div>
        <div className="step-sep" />
        <div className="step">
          <span className="step-num">3</span>
          Önizleme & Uygula
        </div>
      </div>

      <div className="step-grid">
        <section className="card">
          <div className="card-header">
            <div className="card-title">Adım 2: Değişim kuralını seç</div>
            <span className="dim" style={{ fontSize: 12 }}>
              Aşağıdakilerden birini seç ve değeri gir
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <div key={opt.id} className={`opt-card${opt.active ? ' is-active' : ''}`}>
                  <div className="glyph">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="label">{opt.label}</div>
                    <div className="desc">{opt.desc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      className="input mono"
                      defaultValue={opt.id === 'percent' ? '+5.0' : ''}
                      placeholder={opt.id === 'percent' ? undefined : '0.00'}
                      disabled={!opt.active}
                      aria-label={opt.label}
                      style={{ width: opt.id === 'percent' ? 80 : 100, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {opt.id === 'percent' ? '%' : opt.id === 'cost-margin' ? '%' : '$'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 14,
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Yuvarlama</div>
              <select className="select" style={{ width: 200, marginTop: 4 }} defaultValue="99">
                <option value="99">0.99 ile bitir</option>
                <option value="1">En yakın 1.00</option>
                <option value="0.5">En yakın 0.50</option>
                <option value="none">Yuvarlama yok</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Etkili tarih</div>
              <input
                className="input mono"
                defaultValue="2026-06-01"
                style={{ width: 140, marginTop: 4, textAlign: 'center' }}
                aria-label="Etkili tarih"
              />
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <label className="row-flex" style={{ fontSize: 12.5 }}>
                <input type="checkbox" defaultChecked /> Eski fiyatları arşivle
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Link href="/catalogs/price-types" className="btn btn-ghost">
              <ChevronLeft size={14} strokeWidth={1.75} />
              Geri
            </Link>
            <button type="button" className="btn btn-primary">
              Önizleme
              <ChevronRight size={14} strokeWidth={1.75} />
            </button>
          </div>
        </section>

        <aside>
          <div className="impact-card">
            <h3>Canlı etki önizlemesi</h3>
            <div className="impact-stats">
              <div className="impact-stat">
                <div className="lbl">Etkilenecek ürün</div>
                <div className="val">142</div>
                <div className="delta" style={{ color: 'var(--text-muted)' }}>
                  Liste fiyatı · Telefon + Bilgisayar
                </div>
              </div>
              <div className="impact-stat">
                <div className="lbl">Kural</div>
                <div className="val">+5.0%</div>
                <div className="delta" style={{ color: 'var(--text-muted)' }}>
                  .99 yuvarlama açık
                </div>
              </div>
              <div className="impact-stat">
                <div className="lbl">Min fiyat (yeni)</div>
                <div className="val">$103.99</div>
                <div className="delta delta-up">▲ $4.95</div>
              </div>
              <div className="impact-stat">
                <div className="lbl">Max fiyat (yeni)</div>
                <div className="val">$2,623.99</div>
                <div className="delta delta-up">▲ $124.95</div>
              </div>
            </div>
          </div>

          <div className="spacer" />

          <section className="card">
            <div className="card-header">
              <div className="card-title">Etkilenecek ürünler (ilk 8)</div>
              <span className="dim" style={{ fontSize: 11.5 }}>
                142 toplam
              </span>
            </div>
            <table className="data" style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th className="num">Eski</th>
                  <th className="num">Yeni</th>
                  <th className="num">Δ</th>
                </tr>
              </thead>
              <tbody>
                {AFFECTED.map((r) => (
                  <tr key={r.sku}>
                    <td className="mono">{r.sku}</td>
                    <td className="num">{r.old}</td>
                    <td className="num">{r.next}</td>
                    <td className="num delta-up">{r.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </aside>
      </div>
    </>
  );
}
