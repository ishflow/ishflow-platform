import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

type Status = 'ready' | 'beta' | 'coming';

type Integration = {
  slug: string;
  iconText: string;
  name: string;
  category: string;
  desc: string;
  status: Status;
};

const FILTERS = [
  'Tümü',
  'Muhasebe',
  'Ödeme',
  'Banka',
  'Devlet',
  'Mesajlaşma',
  'Otomasyon',
] as const;

const INTEGRATIONS: Integration[] = [
  {
    slug: '1c-migration',
    iconText: '1C',
    name: '1C migration',
    category: 'Muhasebe',
    desc: "1C:Enterprise XML ihracını sürükle-bırak ile ishflow'a yükle. Kataloglar ve açık bakiyeler eşleştirilir.",
    status: 'ready',
  },
  {
    slug: 'stripe',
    iconText: '$',
    name: 'Stripe',
    category: 'Ödeme',
    desc: "Fatura altına Stripe ödeme linki düşür; Stripe webhook'u ödeme belgesini otomatik kapatır.",
    status: 'ready',
  },
  {
    slug: 'qr-cek-aktar',
    iconText: 'QR',
    name: 'QR Çek-Aktar',
    category: 'Banka',
    desc: 'Bişkek bankaları için QR çek-aktar. Müşteri taradığı anda ödeme onayı belgeye işlenir.',
    status: 'beta',
  },
  {
    slug: 'e-devlet',
    iconText: 'eG',
    name: 'E-Devlet (KG/TR)',
    category: 'Devlet',
    desc: 'Türkiye e-fatura ve Kırgızistan elektronik raporlama. Belge geçer geçmez resmi imzaya gönderilir.',
    status: 'beta',
  },
  {
    slug: 'slack',
    iconText: 'SL',
    name: 'Slack',
    category: 'Mesajlaşma',
    desc: 'Onay süreçleri, kritik bakiye uyarıları, gün sonu kapanış — kanalına otomatik düşer.',
    status: 'ready',
  },
  {
    slug: 'telegram-bot',
    iconText: 'TG',
    name: 'Telegram Bot',
    category: 'Mesajlaşma',
    desc: "Bir telegram komutuyla ürün bakiyesi sor, müşteri bilgisi al, fatura PDF'i indir.",
    status: 'ready',
  },
  {
    slug: 'zapier',
    iconText: 'ZP',
    name: 'Zapier',
    category: 'Otomasyon',
    desc: '5000+ uygulama ile köprü kur. Webhook tabanlı, kendi triggerlarına bağla.',
    status: 'coming',
  },
  {
    slug: 'posta-bank',
    iconText: 'PS',
    name: 'Posta Bank',
    category: 'Banka',
    desc: 'Hesap hareketi içe aktarımı. Hareketler ödeme belgeleriyle eşleştirilir.',
    status: 'coming',
  },
];

const STATUS_LABEL: Record<Status, string> = {
  ready: 'Hazır',
  beta: 'Beta',
  coming: 'Geliyor',
};

const STATUS_CLASS: Record<Status, string> = {
  ready: 'pill pill-success',
  beta: 'pill pill-warning',
  coming: 'pill pill-info',
};

export function V2IntegrationsList() {
  return (
    <>
      <div className="filter-row">
        {FILTERS.map((f, idx) => (
          <span key={f} className={`filter-chip${idx === 0 ? ' is-active' : ''}`}>
            {f}
          </span>
        ))}
      </div>
      <div className="integration-grid">
        {INTEGRATIONS.map((i) => (
          <Link key={i.slug} href={`/integrations/${i.slug}`} className="integration-row-card">
            <div className="head">
              <div className="ico">{i.iconText}</div>
              <div>
                <div className="name">{i.name}</div>
                <div className="cat">{i.category}</div>
              </div>
            </div>
            <p>{i.desc}</p>
            <span className={STATUS_CLASS[i.status]}>{STATUS_LABEL[i.status]}</span>
            <span className="go">
              Detay <ArrowRight size={12} strokeWidth={2} />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
