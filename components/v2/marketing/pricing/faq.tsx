import { ChevronDown } from 'lucide-react';

export type FaqItem = { q: string; a: string };

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Yıllık ödemede gerçekten %20 mi indirim var?',
    a: 'Evet. Yıllık peşin ödeme aylığa göre net %20 daha ucuz. İade penceresi 14 gün.',
  },
  {
    q: '14 günlük denemede kart isteniyor mu?',
    a: 'Hayır. Sadece e-posta. Deneme bitiminde otomatik Free plana iniyorsun.',
  },
  {
    q: '1C import hangi planlarda?',
    a: 'Tüm planlarda. Free planda tek seferlik; ücretli planlarda sınırsız.',
  },
  {
    q: 'Kendi sunucuma kurabilir miyim?',
    a: "Enterprise planda on-prem / VPC dağıtımı veriyoruz. Bişkek ve İstanbul'da pilot müşterilerimiz var.",
  },
  {
    q: 'Para birimini seçebilir miyim?',
    a: 'Evet. USD, TRY, RUB, EUR, KGS, UZS desteklenir; fatura tek bir kuruluş para biriminde.',
  },
  {
    q: 'Veri yedeği var mı?',
    a: "Tüm planlarda sürekli yedek; PITR 7 günlük (Free), 35 günlük (Pro+), Enterprise'da özel saklama.",
  },
];

export function V2PricingFaq({ items = FAQ_ITEMS }: { items?: FaqItem[] }) {
  return (
    <section className="faq">
      <h2>Sık sorulanlar</h2>
      <div className="accordion">
        {items.map((item) => (
          <div key={item.q} className="row">
            <div className="q">
              <span>{item.q}</span>
              <ChevronDown size={14} strokeWidth={2} />
            </div>
            <div className="a">{item.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
