import { Link } from '@/platform/i18n/navigation';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  Package,
  Phone,
  Settings,
  Tag,
  Truck,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

type DotTone = 'success' | 'info' | 'on' | 'warning';

type TLItem = {
  date: string;
  time: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  desc: string;
  major?: boolean;
  dot: DotTone;
  meta?: ReactNode;
};

const TIMELINE: TLItem[] = [
  {
    date: '2026-05-16',
    time: '10:42',
    icon: FileText,
    title: 'Alış faturası onaylandı — INVOICE-000012',
    desc: '$52,140.00 · 30 gün vade · 12 kalem ürün. Stok 3 depoya dağıtıldı.',
    major: true,
    dot: 'success',
    meta: (
      <>
        <span>
          <Package size={12} strokeWidth={1.75} /> +248 adet stok
        </span>
        <span>
          <Clock size={12} strokeWidth={1.75} /> Vade: 15 Haz 2026
        </span>
      </>
    ),
  },
  {
    date: '2026-05-14',
    time: '09:00',
    icon: Truck,
    title: 'Sevkiyat alındı — TRANSPORT-088',
    desc: 'İstanbul depo, kapı 2. Tüm kalemler kontrol edildi · kayıp yok.',
    dot: 'on',
  },
  {
    date: '2026-05-12',
    time: '17:08',
    icon: FileText,
    title: 'Sipariş gönderildi — PO-000031',
    desc: '12 kalem · $52,140.00. ETA 14 May 2026.',
    dot: 'on',
  },
  {
    date: '2026-05-08',
    time: '11:00',
    icon: CheckCircle,
    title: 'Ödeme gönderildi — PAY-OUT-000018',
    desc: '$41,837.25 · INVOICE-000010 kapatıldı. Garanti BBVA havalesi.',
    major: true,
    dot: 'success',
    meta: (
      <span>
        <DollarSign size={12} strokeWidth={1.75} /> −$41,837
      </span>
    ),
  },
  {
    date: '2026-05-02',
    time: '14:18',
    icon: Phone,
    title: 'Çağrı kaydı — yeni katalog',
    desc: 'Q3 yeni ürün kataloğu için görüşme yapıldı. 30 yeni SKU önerildi.',
    dot: 'info',
  },
  {
    date: '2026-04-22',
    time: '15:18',
    icon: AlertTriangle,
    title: 'Geç teslimat — 1 gün',
    desc: "PO-000027 hedef 21 Nis idi, 22 Nis'te teslim alındı. Kalite skoru güncellendi.",
    dot: 'warning',
  },
  {
    date: '2026-04-12',
    time: '09:00',
    icon: Tag,
    title: 'Fiyat güncellemesi',
    desc: '8 SKU için yeni fiyat listesi geçerli (USD bazında ortalama +%3.2).',
    dot: 'info',
  },
];

export function Supplier360({ id, name = 'Vatan Bilgisayar' }: { id: string; name?: string }) {
  return (
    <>
      <section className="card">
        <div className="hero-360">
          <div className="av-xl">
            {name
              .split(' ')
              .map((w) => w[0] ?? '')
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="info">
            <div className="name">{name}</div>
            <div className="meta-row">
              <span className="pill pill-danger" style={{ fontSize: 11.5 }}>
                − $48,200.00 borçlu
              </span>
              <span>·</span>
              <span>
                <Clock size={12} strokeWidth={1.75} /> Son aktivite: 16 May 2026 — INVOICE-000012
              </span>
              <span>·</span>
              <span>VKN 1234567890 · 30 gün vade · USD</span>
            </div>
          </div>
          <button type="button" className="btn btn-primary">
            <MessageSquare size={14} strokeWidth={1.75} />
            Mesaj gönder
          </button>
          <Link href={`/catalogs/partners/suppliers/${id}`} className="btn btn-secondary">
            <Settings size={14} strokeWidth={1.75} />
            Düzenle
          </Link>
        </div>
      </section>

      <div className="spacer" />

      <section className="kpi-grid">
        <div className="kpi">
          <div className="label">Toplam alım · YTD</div>
          <div className="value">$284,720.00</div>
          <div className="change up">
            <span className="pct">▲ 18.4%</span>
            <span className="note">Geçen yıla göre</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Açık borç</div>
          <div className="value">$48,200.00</div>
          <div className="change down">
            <span className="pct">2 fatura</span>
            <span className="note">Vade yakın</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Ortalama teslim süresi</div>
          <div className="value">4.2 gün</div>
          <div className="change up">
            <span className="pct">Hedef: 7</span>
            <span className="note">İyi</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Kalite skoru</div>
          <div className="value">9.4 / 10</div>
          <div className="change up">
            <span className="pct">▲ 0.3</span>
            <span className="note">Son 12 ay</span>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <div className="tabbar">
        <Link href={`/catalogs/partners/suppliers/${id}/360`} className="is-active">
          Genel bakış
        </Link>
        <button type="button" className="tabbar-placeholder" disabled>
          Belgeler · 24
        </button>
        <button type="button" className="tabbar-placeholder" disabled>
          Ürünler · 86
        </button>
        <button type="button" className="tabbar-placeholder" disabled>
          Aktivite
        </button>
        <button type="button" className="tabbar-placeholder" disabled>
          Notlar · 2
        </button>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Zaman çizgisi</div>
          <span className="dim" style={{ fontSize: 12 }}>
            Son 18 olay
          </span>
        </div>
        <div className="tl-wrap">
          <div className="tl-line" />
          {TIMELINE.map((it) => (
            <div className={`tl-item${it.major ? ' tl-major' : ''}`} key={`${it.date}-${it.time}`}>
              <div className="tl-date">
                {it.date}
                <br />
                <span style={{ opacity: 0.7 }}>{it.time}</span>
              </div>
              <div className="tl-dot-wrap">
                <div className={`tl-dot tl-${it.dot}`} />
              </div>
              <div className="tl-card">
                <h4>
                  <it.icon size={14} strokeWidth={1.75} />
                  {it.title}
                </h4>
                <p className="desc">{it.desc}</p>
                {it.meta ? <div className="meta">{it.meta}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
