import { Link } from '@/platform/i18n/navigation';
import {
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Settings,
  StickyNote,
  Tag,
  User,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

type DotTone = 'success' | 'info' | 'on';
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
    date: '2026-05-15',
    time: '14:22',
    icon: FileText,
    title: 'Fatura kesildi — SALE-000044',
    desc: '$12,400.00 · 30 gün vade · Ürünler: iPhone 17 Pro Max ×4 + AirPods Pro 3 ×6.',
    major: true,
    dot: 'success',
    meta: (
      <>
        <span>
          <DollarSign size={12} strokeWidth={1.75} /> +$12,400
        </span>
        <span>
          <User size={12} strokeWidth={1.75} /> Dev User
        </span>
      </>
    ),
  },
  {
    date: '2026-05-10',
    time: '10:18',
    icon: Phone,
    title: 'Çağrı kaydı — Ayşe Demir',
    desc: 'Müşteri Q3 sevkiyat planını sordu. Yeni model lansmanı için ilgileniyor.',
    dot: 'info',
  },
  {
    date: '2026-05-02',
    time: '16:50',
    icon: StickyNote,
    title: 'Not eklendi',
    desc: '"Yeni mağaza açılışı için Q3\'te toplu sipariş bekleniyor — 30+ adet MacBook"',
    dot: 'on',
  },
  {
    date: '2026-04-28',
    time: '09:14',
    icon: CheckCircle,
    title: 'Ödeme alındı — PAY-000022',
    desc: '$8,800.00 · SALE-000038 kapatıldı. Banka havalesi · Garanti BBVA TR55.',
    major: true,
    dot: 'success',
    meta: (
      <>
        <span>
          <DollarSign size={12} strokeWidth={1.75} /> +$8,800
        </span>
        <span>
          <CheckCircle size={12} strokeWidth={1.75} /> Vade öncesi
        </span>
      </>
    ),
  },
  {
    date: '2026-04-15',
    time: '14:32',
    icon: Mail,
    title: 'E-posta gönderildi — Q2 katalog',
    desc: '"q2-pricelist.pdf" eki ile birlikte muhasebe@techhub.tr adresine.',
    dot: 'info',
  },
  {
    date: '2026-04-12',
    time: '11:08',
    icon: FileText,
    title: 'Fatura kesildi — SALE-000031',
    desc: '$22,420.00 · 30 gün vade · Samsung Galaxy S24 ×15 + AirPods Pro 3 ×20.',
    dot: 'on',
  },
  {
    date: '2026-04-08',
    time: '15:42',
    icon: Tag,
    title: 'Fiyat türü değişti',
    desc: '"Perakende" → "Toptan". Yeni indirim oranı: %12.',
    dot: 'on',
  },
];

export function Customer360({ id, name = 'Tech Hub Istanbul' }: { id: string; name?: string }) {
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
              <span className="pill pill-warning" style={{ fontSize: 11.5 }}>
                $12,400.00 alacaklı
              </span>
              <span>·</span>
              <span>
                <Clock size={12} strokeWidth={1.75} /> Son aktivite: 15 May 2026, 14:22 —
                SALE-000044 oluşturuldu
              </span>
              <span>·</span>
              <span>VKN 7654321098 · 30 gün vade</span>
            </div>
          </div>
          <button type="button" className="btn btn-primary">
            <MessageSquare size={14} strokeWidth={1.75} />
            Mesaj gönder
          </button>
          <Link href={`/catalogs/partners/customers/${id}`} className="btn btn-secondary">
            <Settings size={14} strokeWidth={1.75} />
            Düzenle
          </Link>
        </div>
      </section>

      <div className="spacer" />

      <section className="kpi-grid">
        <div className="kpi">
          <div className="label">Toplam ciro · YTD</div>
          <div className="value">$184,200.00</div>
          <div className="change up">
            <span className="pct">▲ 22.4%</span>
            <span className="note">Geçen yıla göre</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Açık bakiye</div>
          <div className="value">$12,400.00</div>
          <div className="change up">
            <span className="pct">1 fatura</span>
            <span className="note">Vade içi</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Vadesi geçen</div>
          <div className="value">$0.00</div>
          <div className="change up">
            <span className="pct">0 gecikme</span>
            <span className="note">Son 12 ay</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Ort. ödeme süresi</div>
          <div className="value">21 gün</div>
          <div className="change up">
            <span className="pct">Hedef: 30</span>
            <span className="note">İyi</span>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <div className="tabbar">
        <Link href={`/catalogs/partners/customers/${id}/360`} className="is-active">
          Genel bakış
        </Link>
        <Link href={`/catalogs/partners/customers/${id}/360/documents`}>Belgeler · 18</Link>
        <button type="button" className="tabbar-placeholder" disabled>
          Aktivite
        </button>
        <button type="button" className="tabbar-placeholder" disabled>
          Notlar · 3
        </button>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Zaman çizgisi</div>
          <span className="dim" style={{ fontSize: 12 }}>
            Son 20 olay
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
