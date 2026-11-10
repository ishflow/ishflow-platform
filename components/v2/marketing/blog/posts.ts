export type BlogPost = {
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  cover: string;
};

export const FEATURED_POST: BlogPost = {
  slug: 'vatan-bilgisayar-11-gun',
  tag: 'Müşteri öyküleri · 8 dk',
  title: "Vatan Bilgisayar: 1C'den ishflow'a 11 günde geçtik",
  excerpt:
    "İstanbul'un en eski bilgisayar zinciri, 6 mağazasını ishflow'a taşıma sürecini ve gün başına ne kazandığını anlatıyor. Stok bakiyesi şimdi 30 saniyede değil, anında güncelleniyor.",
  date: '17 Mayıs 2026',
  author: 'Esra Kılıç',
  cover: 'öne çıkan',
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'metadata-driven-schema',
    tag: 'Mimari',
    title: 'Metadata-driven schema neden bizi geliştirici tutmaktan kurtardı',
    excerpt:
      'Catalog → DB tablosu → CRUD UI zincirini tek satırla kuran codegen mimarimizin gerçek bedeli.',
    date: '14 May',
    author: 'Uba A.',
    cover: 'cover · mimari',
  },
  {
    slug: '1c-xml-import',
    tag: '1C göçü',
    title: "1C XML ihracını ishflow'a nasıl yüklersiniz",
    excerpt:
      'Adım adım kılavuz: ihracat formatı, eşleştirme önizleme, açık bakiye yazımı ve rollback senaryosu.',
    date: '10 May',
    author: 'Anton G.',
    cover: 'cover · 1C göçü',
  },
  {
    slug: 'rls-real-weapon',
    tag: 'Güvenlik',
    title: 'RLS niye gerçek silah, niye tek başına yetmez',
    excerpt:
      "Row-Level Security'nin doğru kurulumu, role-bypass riskleri ve dönem kapanışıyla nasıl tamamlanır.",
    date: '5 May',
    author: 'Uba A.',
    cover: 'cover · güvenlik',
  },
  {
    slug: 'posting-engine-decisions',
    tag: 'Ürün',
    title: 'Faturayı geçirme: neden tek tıklık değil, neden olmalı',
    excerpt:
      'Posting motorunun arkasındaki kararlar — neden idempotent, neden transactional, neden geri alınabilir.',
    date: '28 Nis',
    author: 'Daria S.',
    cover: 'cover · ürün',
  },
  {
    slug: 'next-intl-8-locales',
    tag: 'Çeviri & i18n',
    title: "Gün 1'den 5 dil: next-intl ile çift dilli başlık disiplini",
    excerpt:
      'Latin + кириллица başlığını her ekranda göstermek niye sadece konfor değil — operasyonel zorunluluk.',
    date: '21 Nis',
    author: 'Uba A.',
    cover: 'cover · i18n',
  },
  {
    slug: 'naimov-trading-50x-speedup',
    tag: 'Müşteri öyküleri',
    title: "Naimov Trading: Bişkek'te ay sonu kapanışı 4 günden 2 saate",
    excerpt:
      "Mali kapanış sürecini ishflow'un dönem kilidi ve audit kaydıyla nasıl 50× hızlandırdıklarının hikayesi.",
    date: '14 Nis',
    author: 'Esra Kılıç',
    cover: 'cover · müşteri',
  },
  {
    slug: 'info-vs-accumulation-register',
    tag: 'Mimari',
    title: 'Information register vs Accumulation register',
    excerpt: "1C'nin iki temel register türü ve onları doğru kullanmak hangi raporları açar?",
    date: '7 Nis',
    author: 'Anton G.',
    cover: 'cover · mimari',
  },
  {
    slug: 'role-based-ui',
    tag: 'Ürün',
    title: 'Rol bazlı arayüz: aynı ekran, üç farklı dünya',
    excerpt: 'Sahip, kasiyer ve baş muhasebeci ekranı niye aynı tutmuyoruz?',
    date: '31 Mar',
    author: 'Daria S.',
    cover: 'cover · ürün',
  },
  {
    slug: 'r2-iframe-pdf-sandbox',
    tag: 'Güvenlik',
    title: "R2 + iframe = sandbox'lı PDF görüntüleyici",
    excerpt: 'Müşteri ek dosyalarını XSS yüzeyi olmadan göstermenin operasyonel yolu.',
    date: '24 Mar',
    author: 'Uba A.',
    cover: 'cover · güvenlik',
  },
];

export const BLOG_FILTERS = [
  'Tümü',
  'Ürün',
  'Mimari',
  'Müşteri öyküleri',
  '1C göçü',
  'Güvenlik',
  'Çeviri & i18n',
] as const;
