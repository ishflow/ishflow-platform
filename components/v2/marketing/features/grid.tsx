import { ArrowRight, FileCheck, Landmark, Receipt, ScanText, Tags, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

type FeatureItem = {
  slug: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  desc: string;
};

const FEATURES: FeatureItem[] = [
  {
    slug: 'belge-bakiye',
    icon: Receipt,
    eyebrow: 'Belge → Bakiye',
    title: 'Geçirdiğin an stok kıpırdar',
    desc: "Satış faturası, ödeme, fiyat belirleme — her belge geçirildiği an register'lara hareket yazar; geri alınınca tek transaction'da temizlenir.",
  },
  {
    slug: 'depo',
    icon: Warehouse,
    eyebrow: 'Depo Yönetimi',
    title: 'Çoklu depo, gerçek zamanlı stok',
    desc: "Birden fazla depo arasında transfer, sayım, düzenleme. Her hareket stok bakiyesi register'ına yazar — geçmişe dönük raporlar tutarlı kalır.",
  },
  {
    slug: 'fiyat-tipi',
    icon: Tags,
    eyebrow: 'Çoklu Fiyat Tipi',
    title: 'Static + dynamic fiyat tipleri',
    desc: 'Toptan / perakende / kampanya — her müşteri kendi fiyat tipiyle gelir. Dynamic tipler base tipten yüzdeli markup hesaplar; cycle guard koruması var.',
  },
  {
    slug: 'posting-denetim',
    icon: FileCheck,
    eyebrow: 'Posting & Denetim',
    title: 'Audit log + dönem kapanışı',
    desc: 'Her CRUD ve posting hareketi denetim kaydına düşer. Dönem kapatıldıktan sonra geriye dönük değişiklik yapılamaz — sadece operatör onayıyla açılır.',
  },
  {
    slug: 'ai-ocr',
    icon: ScanText,
    eyebrow: 'AI OCR',
    title: 'Faturayı fotoğraftan tanı',
    desc: 'PDF veya fotoğraf yükle; yapay zeka tedarikçi, ürün, miktar ve toplam alanlarını çıkarır. Eşleşmeyenleri tek tıkla düzeltirsin — sonra geçirip kapatırsın.',
  },
  {
    slug: 'banka',
    icon: Landmark,
    eyebrow: 'Banka Entegrasyonu',
    title: 'MT940 / CSV ile mutabakat',
    desc: 'Banka ekstresini sürükle-bırak — sistem her hareketi açık ödemelerle eşleştirir, sapmalar manuel onayına düşer. Mutabakat saatler değil dakikalar sürer.',
  },
];

export function V2FeaturesGrid() {
  return (
    <div className="feature-grid">
      {FEATURES.map((f) => {
        const Icon = f.icon;
        return (
          <article key={f.slug} className="feature-card">
            <div className="glyph">
              <Icon size={20} strokeWidth={1.75} />
            </div>
            <div className="eyebrow">{f.eyebrow}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            <Link className="link" href={`/features/${f.slug}`}>
              Daha fazla
              <ArrowRight size={12} strokeWidth={2} />
            </Link>
          </article>
        );
      })}
    </div>
  );
}
