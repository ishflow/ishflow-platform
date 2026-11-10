import { Boxes, FileText, Globe, Lock, Package, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

const FEATURES: Feature[] = [
  {
    icon: Package,
    title: 'Kataloglar',
    desc: 'Ürün, müşteri, tedarikçi, fiyat türü — kayıt sayfaları tek bir metadata satırından açılır.',
  },
  {
    icon: FileText,
    title: 'Belgeler',
    desc: 'Fatura, ödeme, fiyat belirleme — geçirildiği an kayıtlara hareket bırakır, geri alındığında temizler.',
  },
  {
    icon: Boxes,
    title: 'Kayıtlar',
    desc: 'Stok bakiyesi, alacak, borç, satış — gerçek zamanlı materialize register’lar olarak akar.',
  },
  {
    icon: TrendingUp,
    title: 'Raporlar',
    desc: 'Brüt kar, ciro pivot, dönem kapanışı. Her rapor altındaki kaydı tek tık ile geri izler.',
  },
  {
    icon: Lock,
    title: 'Çok kiracılı RLS',
    desc: "Her sorgu kiracı izole. Süper kullanıcı bile RLS'i delemez — bu mimari, opsiyon değil.",
  },
  {
    icon: Globe,
    title: '5 dilde, gün 1’den',
    desc: 'RU, EN, TR, UZ, KY. Her bileşen iki dilli başlık (latin + кириллица) gösterir.',
  },
];

export function V2LandingFeatures() {
  return (
    <section className="section container">
      <div className="section-hd">
        <div className="eyebrow">Ürün</div>
        <h2>Bir 1C, üç dosya kadar hafif</h2>
        <p>
          Catalog · Document · Register üçlüsünü kod yazmadan tanımlarsınız; veritabanı, CRUD ve UI
          sizinle birlikte büyür.
        </p>
      </div>
      <div className="feature-grid">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="feature-card">
              <div className="glyph">
                <Icon size={20} strokeWidth={1.75} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
