import { EnterAppLink } from '@/components/v2/settings/onboarding/enter-app-link';
import { V2OnboardingFrame } from '@/components/v2/settings/onboarding/wizard-frame';
import { FileText, Package, Play, Settings, TrendingUp, Users } from 'lucide-react';

type Module = {
  id: string;
  icon: React.ReactNode;
  title: string;
  steps: number;
  minutes: string;
  desc: string;
  progress: number; // 0-100
};

const MODULES: Module[] = [
  {
    id: 'documents',
    icon: <FileText size={18} strokeWidth={1.75} />,
    title: 'Belgeler',
    steps: 8,
    minutes: '~3 dakika',
    desc: 'Satış/alış faturası oluştur, satır ekle, fiyat tipi seç, kaydet ve onayla (post). Schet-Faktura görüntüleme dahil.',
    progress: 62,
  },
  {
    id: 'partners',
    icon: <Users size={18} strokeWidth={1.75} />,
    title: 'Müşteriler',
    steps: 5,
    minutes: '~2 dakika',
    desc: 'Müşteri kartı oluştur, ödeme bakiyesini gör, fiyat tipi ata, geçmiş işlemleri filtrele.',
    progress: 100,
  },
  {
    id: 'products',
    icon: <Package size={18} strokeWidth={1.75} />,
    title: 'Ürünler',
    steps: 6,
    minutes: '~2 dakika',
    desc: 'Ürün ekle, stok girişi yap, fiyat tipi ata, CSV ile toplu içe aktarım.',
    progress: 0,
  },
  {
    id: 'reports',
    icon: <TrendingUp size={18} strokeWidth={1.75} />,
    title: 'Raporlar',
    steps: 5,
    minutes: '~2 dakika',
    desc: 'Brüt kar, A/R, A/P, dönem kapatma. Filtrele, pivot dimension seç, CSV indir.',
    progress: 20,
  },
];

export default function V2OnboardingTourPage() {
  const totalSteps = MODULES.reduce((a, m) => a + m.steps, 0);
  return (
    <V2OnboardingFrame step={4} total={4}>
      <section className="onb-card wide" style={{ maxWidth: 880 }}>
        <div className="tour-hero">
          <div>
            <h2>Tüm turu yeniden başlat</h2>
            <p>
              4 modülü baştan sona 8 dakikada gez. Her adımda canlı veriyle çalışacaksın, ister atla
              ister tekrar et — istediğin zaman duraklat.
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <button className="btn btn-primary" type="button">
              <Play size={16} strokeWidth={1.75} />
              Tüm turu başlat
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ~8 dakika · {totalSteps} adım
            </span>
          </div>
        </div>

        <div className="spacer" />

        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            margin: '16px 0 12px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Modül turları
        </div>

        <div className="tour-grid">
          {MODULES.map((m) => (
            <div key={m.id} className={`tour-card${m.progress === 100 ? ' is-done' : ''}`}>
              <div className="head">
                <div className="ico">{m.icon}</div>
                <div>
                  <h3>{m.title}</h3>
                  <div className="meta">
                    {m.steps} adım · {m.minutes}
                  </div>
                </div>
              </div>
              <div className="desc">{m.desc}</div>
              <div className="foot">
                <div className="progress">
                  <div className="fill" style={{ width: `${m.progress}%` }} />
                </div>
                <span className="pct">
                  {m.progress === 100
                    ? 'Tamamlandı'
                    : m.progress > 0
                      ? `${Math.round((m.progress / 100) * m.steps)} / ${m.steps}`
                      : 'Başlanmadı'}
                </span>
                <button
                  className={`btn btn-${m.progress === 100 ? 'ghost' : m.progress > 0 ? 'secondary' : 'primary'} btn-sm`}
                  type="button"
                >
                  {m.progress === 100 ? 'Tekrar et' : m.progress > 0 ? 'Devam et' : 'Başla'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="onb-actions">
          <EnterAppLink className="onb-skip">
            <Settings size={14} strokeWidth={1.75} style={{ marginRight: 4 }} />
            Panele dön
          </EnterAppLink>
        </div>
      </section>
    </V2OnboardingFrame>
  );
}
