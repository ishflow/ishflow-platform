/**
 * Hard-coded fallback content for every marketing section. The site
 * always renders these unless an SA editor has saved a `MarketingSection`
 * override row for that `(pageKey, sectionKey, locale)` tuple.
 *
 * Keeping defaults here lets us ship the public site without populating
 * a CMS first, and gives Marketing a sane baseline to clone from when
 * authoring custom copy.
 */

import type {
  AddonSpotlightContent,
  CtaStripContent,
  DemoSectionContent,
  FaqContent,
  FeatureGridContent,
  FooterContent,
  HeroContent,
  MarkdownContent,
  PricingComparisonContent,
  PricingTableContent,
  SectionContent,
  ShowcaseContent,
  SocialProofContent,
  StatsStripContent,
  TestimonialsContent,
} from './types';

type DefaultLocale = 'en' | 'ru' | 'tr';

function pickLocale(locale: string): DefaultLocale {
  if (locale === 'ru' || locale === 'tr') return locale;
  return 'en';
}

const HOME_HERO: Record<DefaultLocale, HeroContent> = {
  en: {
    eyebrow: 'Features · Cloud accounting',
    headline: 'Accounting, inventory and reports. Right in your browser.',
    subhead:
      'Everything you keep 1C for — documents, counterparties, multi-company, reporting — now without a Windows server, remote desktop or a sysadmin on speed-dial.',
    primaryCta: { label: 'Start free', href: '/sign-up' },
    secondaryCta: { label: 'Watch demo', href: '/demo' },
    trustItems: ['No credit card', '14-day trial', 'Free data migration'],
  },
  ru: {
    eyebrow: 'Возможности · Облачный учёт',
    headline: 'Учёт, склад и отчёты. Прямо в браузере.',
    subhead:
      'Всё, ради чего вы держите 1С — документы, контрагенты, мультикомпания, отчётность — теперь без Windows-сервера, удалённого рабочего стола и админа на телефоне.',
    primaryCta: { label: 'Начать бесплатно', href: '/sign-up' },
    secondaryCta: { label: 'Смотреть демо', href: '/demo' },
    trustItems: ['Без банковской карты', '14 дней пробный период', 'Перенос данных бесплатно'],
  },
  tr: {
    eyebrow: 'Özellikler · Bulut muhasebe',
    headline: 'Muhasebe, stok ve raporlar. Doğrudan tarayıcıda.',
    subhead:
      "1C'yi tuttuğunuz her şey — belgeler, cariler, çoklu şirket, raporlama — artık Windows sunucusuz, uzak masaüstüsüz ve telefondaki sistem yöneticisi olmadan.",
    primaryCta: { label: 'Ücretsiz başla', href: '/sign-up' },
    secondaryCta: { label: 'Demoyu izle', href: '/demo' },
    trustItems: ['Kart gerekmez', '14 gün deneme', 'Ücretsiz veri taşıma'],
  },
};

const SOCIAL_PROOF_LOGOS = [
  { name: 'Северный Путь' },
  { name: 'Каримов и партнёры' },
  { name: 'Невские Окна' },
  { name: 'Алмаз-Строй' },
  { name: 'ТехноСервис' },
  { name: 'TextileLab' },
] as const;

const HOME_SOCIAL_PROOF: Record<DefaultLocale, SocialProofContent> = {
  en: {
    stats: [
      { value: '1,200+', label: 'companies on the platform' },
      { value: '8 languages', label: 'interface localisation' },
      { value: '99.9%', label: 'uptime over 12 months' },
      { value: '14 days', label: 'trial — no card needed' },
    ],
    logos: [...SOCIAL_PROOF_LOGOS],
  },
  ru: {
    stats: [
      { value: '1 200+', label: 'компаний на платформе' },
      { value: '8 языков', label: 'локализация интерфейса' },
      { value: '99.9%', label: 'аптайм за 12 месяцев' },
      { value: '14 дней', label: 'триал без карты' },
    ],
    logos: [...SOCIAL_PROOF_LOGOS],
  },
  tr: {
    stats: [
      { value: '1 200+', label: 'platformdaki şirketler' },
      { value: '8 dil', label: 'arayüz yerelleştirmesi' },
      { value: '99.9%', label: '12 ay uptime' },
      { value: '14 gün', label: 'kartsız deneme' },
    ],
    logos: [...SOCIAL_PROOF_LOGOS],
  },
};

const HOME_FEATURE_CARDS: Record<DefaultLocale, FeatureGridContent> = {
  en: {
    cards: [
      {
        id: 'catalogs',
        iconKey: 'catalog',
        title: 'Catalogs',
        body: 'Counterparties, products, prices, units of measure. Excel import and supplier data exchange.',
        href: '/features/catalogs',
      },
      {
        id: 'documents',
        iconKey: 'doc',
        title: 'Documents',
        body: 'Sales, receipts, invoices, acts, UPD. Templates, printable forms, approval workflows.',
        href: '/features/documents',
      },
      {
        id: 'inventory',
        iconKey: 'box',
        title: 'Warehouse accounting',
        body: 'Batches, serials, bins, scanner-based stock-takes. Multi-warehouse logic without pain.',
        href: '/features/inventory',
      },
      {
        id: 'reports',
        iconKey: 'report',
        title: 'Reports',
        body: 'Trial balance, ledger cards, cash flow, profitability. Custom reports — by mouse, no developer.',
        href: '/features/reports',
      },
      {
        id: 'multi',
        iconKey: 'org',
        title: 'Multi-company + permissions',
        body: 'Dozens of legal entities in one window. Granular roles per warehouse, cash desk, counterparty and document type.',
        href: '/features/multi',
      },
      {
        id: 'mobile',
        iconKey: 'phone',
        title: 'Mobile app',
        body: 'iOS and Android. Approvals, stock levels, issuing invoices from the road — offline mode included.',
        href: '/features/mobile',
      },
      {
        id: 'api',
        iconKey: 'api',
        title: 'Open API',
        body: 'REST + webhooks. SDKs in Python, PHP and 1C:Bridge. OAuth for partner integrations.',
        href: '/features/api',
      },
      {
        id: 'integrations',
        iconKey: 'plug',
        title: 'Integrations',
        body: 'Banks, OFD, marketplaces, CDEK, Kontur, Diadoc. Connect in 3 minutes, not 3 days.',
        href: '/features/integrations',
      },
    ],
  },
  ru: {
    cards: [
      {
        id: 'catalogs',
        iconKey: 'catalog',
        title: 'Каталоги',
        body: 'Контрагенты, номенклатура, цены, единицы измерения. Импорт из Excel и обмен с поставщиками.',
        href: '/features/catalogs',
      },
      {
        id: 'documents',
        iconKey: 'doc',
        title: 'Документы',
        body: 'Реализации, поступления, счета, акты, УПД. Шаблоны, печатные формы, статусы согласования.',
        href: '/features/documents',
      },
      {
        id: 'inventory',
        iconKey: 'box',
        title: 'Складской учёт',
        body: 'Партии, серии, ячейки, инвентаризация со сканера. Многоскладская логика без боли.',
        href: '/features/inventory',
      },
      {
        id: 'reports',
        iconKey: 'report',
        title: 'Отчёты',
        body: 'ОСВ, карточки счетов, движение денег, рентабельность. Свои отчёты — мышкой, без программиста.',
        href: '/features/reports',
      },
      {
        id: 'multi',
        iconKey: 'org',
        title: 'Мультикомпания + права',
        body: 'Десятки юрлиц в одном окне. Гибкие роли по складам, кассам, контрагентам и видам документов.',
        href: '/features/multi',
      },
      {
        id: 'mobile',
        iconKey: 'phone',
        title: 'Мобильное приложение',
        body: 'iOS и Android. Согласования, остатки, выставление счетов из машины — оффлайн-режим прилагается.',
        href: '/features/mobile',
      },
      {
        id: 'api',
        iconKey: 'api',
        title: 'Открытое API',
        body: 'REST + webhooks. SDK на Python, PHP и 1С:Бридж. OAuth для интеграций партнёров.',
        href: '/features/api',
      },
      {
        id: 'integrations',
        iconKey: 'plug',
        title: 'Интеграции',
        body: 'Банки, ОФД, маркетплейсы, СДЭК, Контур, Диадок. Подключение — 3 минуты, не 3 дня.',
        href: '/features/integrations',
      },
    ],
  },
  tr: {
    cards: [
      {
        id: 'catalogs',
        iconKey: 'catalog',
        title: 'Kataloglar',
        body: 'Cariler, stok kalemleri, fiyatlar, ölçü birimleri. Excel içe aktarımı ve tedarikçi veri alışverişi.',
        href: '/features/catalogs',
      },
      {
        id: 'documents',
        iconKey: 'doc',
        title: 'Belgeler',
        body: 'Satışlar, alımlar, faturalar, irsaliyeler, UPD. Şablonlar, basılı formlar, onay iş akışları.',
        href: '/features/documents',
      },
      {
        id: 'inventory',
        iconKey: 'box',
        title: 'Depo muhasebesi',
        body: 'Partiler, seriler, raflar, barkodla sayım. Çok depo mantığı sancısız.',
        href: '/features/inventory',
      },
      {
        id: 'reports',
        iconKey: 'report',
        title: 'Raporlar',
        body: 'Mizan, hesap kartları, nakit akışı, kârlılık. Özel raporlar — fareyle, geliştirici olmadan.',
        href: '/features/reports',
      },
      {
        id: 'multi',
        iconKey: 'org',
        title: 'Çoklu şirket + yetkiler',
        body: 'Tek pencerede onlarca tüzel kişi. Depo, kasa, cari ve belge tipi bazında ince ayar roller.',
        href: '/features/multi',
      },
      {
        id: 'mobile',
        iconKey: 'phone',
        title: 'Mobil uygulama',
        body: 'iOS ve Android. Onaylar, stok bakiyeleri, yoldan fatura kesme — offline mod dahil.',
        href: '/features/mobile',
      },
      {
        id: 'api',
        iconKey: 'api',
        title: 'Açık API',
        body: 'REST + webhook. Python, PHP ve 1C:Bridge SDK. Partner entegrasyonları için OAuth.',
        href: '/features/api',
      },
      {
        id: 'integrations',
        iconKey: 'plug',
        title: 'Entegrasyonlar',
        body: 'Bankalar, OFD, pazaryerleri, CDEK, Kontur, Diadoc. 3 dakikada bağlanır, 3 günde değil.',
        href: '/features/integrations',
      },
    ],
  },
};

const HOME_ADDON_SPOTLIGHT: Record<DefaultLocale, AddonSpotlightContent> = {
  en: {
    headline: 'Add only what you need.',
    body: 'Twelve extensions for billing, OCR, marketplaces, banking and EDI. Toggle them per workspace — no separate install, no re-integration.',
    items: [
      { addonKey: 'ai_invoice_ocr', tag: 'AI', price: 'from 990 ₽/mo' },
      { addonKey: 'bank_integration', tag: 'Finance', price: 'included with Pro' },
      { addonKey: 'kkt_54fz', tag: 'Cash desk', price: 'from 1,490 ₽/mo' },
      { addonKey: 'edo_integration', tag: 'EDI', price: 'from 690 ₽/mo' },
      { addonKey: 'marketplace_sync', tag: 'Logistics', price: 'from 1,290 ₽/mo' },
      { addonKey: 'telegram_bot', tag: 'EDI', price: 'included' },
    ],
  },
  ru: {
    headline: 'Добавьте только то, что нужно.',
    body: 'Двенадцать расширений для биллинга, OCR, маркетплейсов, банков и ЭДО. Каждое включается на уровне рабочего пространства — без отдельной установки и повторной интеграции.',
    items: [
      { addonKey: 'ai_invoice_ocr', tag: 'AI', price: 'от 990 ₽/мес' },
      { addonKey: 'bank_integration', tag: 'Финансы', price: 'включено в Pro' },
      { addonKey: 'kkt_54fz', tag: 'Касса', price: 'от 1 490 ₽/мес' },
      { addonKey: 'edo_integration', tag: 'ЭДО', price: 'от 690 ₽/мес' },
      { addonKey: 'marketplace_sync', tag: 'Логистика', price: 'от 1 290 ₽/мес' },
      { addonKey: 'telegram_bot', tag: 'ЭДО', price: 'включено' },
    ],
  },
  tr: {
    headline: 'Sadece ihtiyacınız olanı ekleyin.',
    body: 'Faturalama, OCR, pazaryerleri, banka ve EDI için on iki eklenti. Çalışma alanı başına açıp kapatın — ayrı kurulum ve yeniden entegrasyon yok.',
    items: [
      { addonKey: 'ai_invoice_ocr', tag: 'AI', price: '990 ₽/aydan' },
      { addonKey: 'bank_integration', tag: 'Finans', price: "Pro'ya dahil" },
      { addonKey: 'kkt_54fz', tag: 'Kasa', price: '1 490 ₽/aydan' },
      { addonKey: 'edo_integration', tag: 'EDI', price: '690 ₽/aydan' },
      { addonKey: 'marketplace_sync', tag: 'Lojistik', price: '1 290 ₽/aydan' },
      { addonKey: 'telegram_bot', tag: 'EDI', price: 'dahil' },
    ],
  },
};

const HOME_DEMO: Record<DefaultLocale, DemoSectionContent> = {
  en: {
    headline: 'See the product in action',
    body: 'A live demo workspace with seeded data — no signup needed. Try posting a sales invoice, browsing the register, exporting a turnover report.',
    bullets: [
      'Pre-loaded customers, products, opening balances',
      'Read-only demo, refreshed nightly',
      'Switch between 8 UI languages on the fly',
    ],
  },
  ru: {
    headline: 'Посмотрите, как работает продукт',
    body: 'Демо-пространство с готовыми данными — регистрация не требуется. Проведите счёт, посмотрите регистр, выгрузите отчёт по оборотам.',
    bullets: [
      'Контрагенты, товары и начальные остатки уже загружены',
      'Только чтение, обновляется каждую ночь',
      'Переключайте 8 языков интерфейса на лету',
    ],
  },
  tr: {
    headline: 'Ürünü canlı görün',
    body: "Veriyle dolu canlı demo çalışma alanı — kayıt gerekmiyor. Satış faturası post'la, kaydı gez, ciro raporu indir.",
    bullets: [
      'Önceden yüklü müşteri, ürün, açılış bakiyeleri',
      'Yalnızca okuma — gecelik yenileme',
      'Anında 8 arayüz dili arasında geçiş',
    ],
  },
};

const HOME_TESTIMONIALS: Record<DefaultLocale, TestimonialsContent> = {
  en: {
    items: [
      {
        quote:
          "We switched off desktop 1C in two weeks. The biggest win: I don't call the sysadmin every Friday because the server 'won't open again'.",
        authorName: 'Alina Mikhailova',
        authorRole: 'Chief accountant',
        authorCompany: 'OOO Severnyy Put',
      },
      {
        quote:
          'Eight legal entities, three warehouses, four cash desks. Before: four databases and TeamViewer. Now: one login and proper search.',
        authorName: 'Timur Karimov',
        authorRole: 'Operations director',
        authorCompany: 'Karimov & Partners Group',
      },
      {
        quote:
          'My bookkeeper is in Bishkek, I am in Tashkent, the warehouse is in Almaty. Once a week we review reports on Zoom — straight inside ishflow.',
        authorName: 'Elena Sokolova',
        authorRole: 'Founder',
        authorCompany: 'TextileLab',
      },
    ],
  },
  ru: {
    items: [
      {
        quote:
          'Перешли с десктопной 1С за две недели. Главное — больше не звоню админу по пятницам, когда сервер «опять не открывается».',
        authorName: 'Алина Михайлова',
        authorRole: 'Главный бухгалтер',
        authorCompany: 'ООО «Северный Путь»',
      },
      {
        quote:
          'Восемь юрлиц, три склада, четыре кассы. Раньше — четыре базы и Тимвьюер. Сейчас — один логин и нормальный поиск.',
        authorName: 'Тимур Каримов',
        authorRole: 'Операционный директор',
        authorCompany: 'Группа «Каримов и партнёры»',
      },
      {
        quote:
          'Бухгалтер у меня в Бишкеке, я в Ташкенте, склад в Алматы. Раз в неделю смотрим отчёты в Zoom прямо в окне ishflow.',
        authorName: 'Елена Соколова',
        authorRole: 'Основатель',
        authorCompany: 'TextileLab',
      },
    ],
  },
  tr: {
    items: [
      {
        quote:
          "Masaüstü 1C'yi iki haftada bıraktık. En büyük kazanç: sunucu yine açılmadığında her cuma sistem yöneticisini aramıyorum.",
        authorName: 'Alina Mihaylova',
        authorRole: 'Baş muhasebeci',
        authorCompany: 'OOO Severnıy Put',
      },
      {
        quote:
          'Sekiz tüzel kişi, üç depo, dört kasa. Eskiden dört veritabanı ve TeamViewer. Şimdi tek giriş ve düzgün arama.',
        authorName: 'Timur Karimov',
        authorRole: 'Operasyon direktörü',
        authorCompany: 'Karimov ve Ortakları Grup',
      },
      {
        quote:
          "Muhasebecim Bişkek'te, ben Taşkent'teyim, depo Almatı'da. Haftada bir raporları doğrudan ishflow penceresinden Zoom'da inceliyoruz.",
        authorName: 'Elena Sokolova',
        authorRole: 'Kurucu',
        authorCompany: 'TextileLab',
      },
    ],
  },
};

const HOME_FAQ: Record<DefaultLocale, FaqContent> = {
  en: {
    items: [
      {
        q: 'How is ishflow different from desktop 1C?',
        a: "It's not a clone — it's an alternative. The same familiar accounting logic, the same canonical document and report structure, but a different architecture: no terminal servers, no thick Windows clients. Open a browser, get to work. On any device, in any country.",
      },
      {
        q: 'Can I migrate data from my existing database?',
        a: 'Yes. We import catalogs, balances and turnovers from DT/XML exports. For a typical 5–50-person base, migration takes 1–3 working days and is free on Pro and above.',
      },
      {
        q: 'Where is data stored? Is it 152-FZ compliant?',
        a: 'Data centres in Russia (Moscow, St Petersburg) and Kazakhstan. All data is encrypted at rest and in transit; we meet 152-FZ requirements. SLA and InfoSec audit subscription available on request.',
      },
      {
        q: 'What if the internet goes down?',
        a: 'The mobile app keeps working offline — view stock, issue an invoice, approve a document. Once the connection returns, everything syncs. The web client has a local draft mode.',
      },
      {
        q: 'Is there integration with government systems?',
        a: 'Yes: OFD, EDI (Diadoc, Kontur, Taxcom), reporting to FNS and SFR through operators, traceability, Chestny Znak marking, EGAIS.',
      },
      {
        q: 'How much does migration cost?',
        a: 'Basic migration (catalogs + balances) is free on Pro and Business. Full document history transfer starts at 25,000 ₽, fixed price, no hidden fees. 14-day trial without a card — try it before deciding.',
      },
      {
        q: 'Who will train the team?',
        a: 'A 4-hour video course covers 90% of operations. There is a dedicated module for accountants (VAT, reporting, month-end close). On Business — a dedicated manager and live webinars.',
      },
      {
        q: 'Can I use it outside Russia?',
        a: 'Yes. We support accounting rules for RU, KZ, UZ, KG. Multi-currency, multi-company, localised printable forms and reports.',
      },
    ],
  },
  ru: {
    items: [
      {
        q: 'Чем ishflow отличается от десктопной 1С?',
        a: 'Это не клон — это альтернатива. Привычная логика учёта, типовая структура документов и отчётов, но архитектура другая: никаких терминальных серверов, никаких толстых клиентов под Windows. Открываете браузер — работаете. На любом устройстве, в любой стране.',
      },
      {
        q: 'Можно ли перенести данные из существующей базы?',
        a: 'Да. Импортируем справочники, остатки и обороты из выгрузок DT/XML. Для типичной базы 5–50 сотрудников миграция занимает 1–3 рабочих дня, мы помогаем бесплатно на тарифах Pro и выше.',
      },
      {
        q: 'Где хранятся данные? Соответствие 152-ФЗ?',
        a: 'Дата-центры в России (Москва, СПб) и в Казахстане. Все данные шифруются в покое и при передаче, выполняем требования 152-ФЗ. По запросу — соглашение об уровне сервиса (SLA) и подписка на ИБ-аудит.',
      },
      {
        q: 'Что если интернет пропал?',
        a: 'Мобильное приложение продолжает работать оффлайн — посмотреть остатки, выставить счёт, согласовать документ. Как только связь восстановится, всё синхронизируется. Для веб-клиента есть локальный режим черновиков.',
      },
      {
        q: 'Есть ли обмен с государственными системами?',
        a: 'Да: ОФД, ЭДО (Диадок, Контур, Такском), отправка отчётности в ФНС и СФР через операторов, прослеживаемость товаров, маркировка «Честный знак», ЕГАИС.',
      },
      {
        q: 'Сколько стоит миграция?',
        a: 'Базовая миграция (справочники + остатки) — бесплатно на тарифах Pro и Business. Полный перенос истории с документами — от 25 000 ₽, фикс-стоимость, без скрытых платежей. Триал 14 дней без карты — попробуйте до решения.',
      },
      {
        q: 'Кто будет учить сотрудников?',
        a: 'Видео-курс на 4 часа покрывает 90% операций. Для бухгалтеров — отдельный модуль (НДС, отчётность, закрытие месяца). На Business — выделенный менеджер и онлайн-вебинары.',
      },
      {
        q: 'Можно ли пользоваться вне России?',
        a: 'Да. Поддерживаем учёт по правилам РФ, РК, УЗ, КГ. Мульти-валюта, мульти-юрлицо, локализованные печатные формы и отчёты.',
      },
    ],
  },
  tr: {
    items: [
      {
        q: "ishflow masaüstü 1C'den nasıl farklı?",
        a: 'Klon değil — alternatif. Aynı tanıdık muhasebe mantığı, aynı tipik belge ve rapor yapısı; ama farklı bir mimari: terminal sunucu yok, kalın Windows istemcisi yok. Tarayıcıyı açın, çalışmaya başlayın. Her cihazda, her ülkede.',
      },
      {
        q: 'Mevcut veritabanımdan veri taşıyabilir miyim?',
        a: 'Evet. DT/XML çıktılarından katalogları, bakiyeleri ve hareketleri içe aktarıyoruz. 5–50 kişilik tipik bir bazda taşıma 1–3 iş günü sürer; Pro ve üzeri planlarda ücretsizdir.',
      },
      {
        q: 'Veriler nerede tutuluyor? 152-FZ uyumu var mı?',
        a: "Rusya (Moskova, St. Petersburg) ve Kazakistan'da veri merkezleri. Tüm veriler dururken ve aktarımda şifrelenir; 152-FZ gerekliliklerini karşılıyoruz. Talep üzerine SLA ve InfoSec audit aboneliği.",
      },
      {
        q: 'İnternet giderse ne olur?',
        a: 'Mobil uygulama offline çalışmaya devam eder — stok görüntüleme, fatura kesme, belge onaylama. Bağlantı dönünce her şey eşitlenir. Web istemcisinin yerel taslak modu vardır.',
      },
      {
        q: 'Devlet sistemleriyle entegrasyon var mı?',
        a: 'Evet: OFD, EDI (Diadoc, Kontur, Taxcom), operatörler üzerinden FNS ve SFR raporlama, izlenebilirlik, Chestny Znak markalama, EGAIS.',
      },
      {
        q: 'Taşıma ne kadar?',
        a: 'Temel taşıma (kataloglar + bakiyeler) Pro ve Business planlarında ücretsizdir. Tam belge geçmişi taşıması 25 000 ₽ sabit fiyattan başlar, gizli ücret yok. 14 gün kartsız deneme — önce deneyin.',
      },
      {
        q: 'Ekibi kim eğitecek?',
        a: '4 saatlik video kurs operasyonların %90’ını kapsar. Muhasebeciler için ayrı modül (KDV, raporlama, dönem kapanışı). Business planında özel müdür ve canlı webinarlar.',
      },
      {
        q: 'Rusya dışında kullanabilir miyim?',
        a: 'Evet. RU, KZ, UZ, KG muhasebe kurallarını destekliyoruz. Çoklu para birimi, çoklu tüzel kişi, yerelleştirilmiş basılı formlar ve raporlar.',
      },
    ],
  },
};

const HOME_CTA: Record<DefaultLocale, CtaStripContent> = {
  en: {
    headline: 'Ready to try it? No card, 14 days.',
    body: "We'll migrate data from your current base for free. We'll show you how to close the first month.",
    primaryCta: { label: 'Start free', href: '/sign-up' },
    secondaryCta: { label: 'Talk to a manager', href: '/contact' },
  },
  ru: {
    headline: 'Готовы попробовать? Без карты, 14 дней.',
    body: 'Перенесём данные из вашей текущей базы бесплатно. Покажем, как закрыть первый месяц.',
    primaryCta: { label: 'Начать бесплатно', href: '/sign-up' },
    secondaryCta: { label: 'Поговорить с менеджером', href: '/contact' },
  },
  tr: {
    headline: 'Denemeye hazır mısınız? Kartsız, 14 gün.',
    body: 'Mevcut bazınızdan verileri ücretsiz taşıyoruz. İlk ayı nasıl kapatacağınızı gösteriyoruz.',
    primaryCta: { label: 'Ücretsiz başla', href: '/sign-up' },
    secondaryCta: { label: 'Bir yöneticiyle konuş', href: '/contact' },
  },
};

const FOOTER: Record<DefaultLocale, FooterContent> = {
  en: {
    tagline: 'Modern 1C — built for SMBs that want fewer surprises and more done.',
    columns: [
      {
        title: 'Product',
        links: [
          { label: 'Features', href: '/features' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Add-ons', href: '/integrations' },
          { label: 'Changelog', href: '/changelog' },
          { label: 'Roadmap', href: '/roadmap' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { label: 'Blog', href: '/blog' },
          { label: 'Contact', href: '/contact' },
          { label: 'Security', href: '/security' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '/about' },
          { label: 'Privacy', href: '/privacy' },
          { label: 'Terms', href: '/terms' },
        ],
      },
      {
        title: 'Get started',
        links: [
          { label: 'Sign up', href: '/sign-up' },
          { label: 'Sign in', href: '/sign-in' },
        ],
      },
    ],
  },
  ru: {
    tagline: 'Современный учёт для малого бизнеса — меньше сюрпризов, больше сделанной работы.',
    columns: [
      {
        title: 'Продукт',
        links: [
          { label: 'Возможности', href: '/features' },
          { label: 'Тарифы', href: '/pricing' },
          { label: 'Аддоны', href: '/integrations' },
          { label: 'История изменений', href: '/changelog' },
          { label: 'Дорожная карта', href: '/roadmap' },
        ],
      },
      {
        title: 'Ресурсы',
        links: [
          { label: 'Блог', href: '/blog' },
          { label: 'Контакты', href: '/contact' },
          { label: 'Безопасность', href: '/security' },
        ],
      },
      {
        title: 'Компания',
        links: [
          { label: 'О нас', href: '/about' },
          { label: 'Конфиденциальность', href: '/privacy' },
          { label: 'Условия', href: '/terms' },
        ],
      },
      {
        title: 'Начать',
        links: [
          { label: 'Регистрация', href: '/sign-up' },
          { label: 'Вход', href: '/sign-in' },
        ],
      },
    ],
  },
  tr: {
    tagline: 'KOBİ için modern ERP — daha az sürpriz, daha fazla yapılmış iş.',
    columns: [
      {
        title: 'Ürün',
        links: [
          { label: 'Özellikler', href: '/features' },
          { label: 'Fiyatlandırma', href: '/pricing' },
          { label: 'Eklentiler', href: '/integrations' },
          { label: 'Changelog', href: '/changelog' },
          { label: 'Yol haritası', href: '/roadmap' },
        ],
      },
      {
        title: 'Kaynaklar',
        links: [
          { label: 'Blog', href: '/blog' },
          { label: 'İletişim', href: '/contact' },
          { label: 'Güvenlik', href: '/security' },
        ],
      },
      {
        title: 'Şirket',
        links: [
          { label: 'Hakkımızda', href: '/about' },
          { label: 'Gizlilik', href: '/privacy' },
          { label: 'Koşullar', href: '/terms' },
        ],
      },
      {
        title: 'Başla',
        links: [
          { label: 'Kayıt ol', href: '/sign-up' },
          { label: 'Giriş', href: '/sign-in' },
        ],
      },
    ],
  },
};

const ABOUT_BODY: Record<DefaultLocale, MarkdownContent> = {
  en: {
    body: [
      '# About ishflow',
      '',
      'ishflow brings the discipline of 1C:Enterprise — Catalogs, Documents, Registers, posting — to a modern SaaS. No Windows servers, no per-seat licenses, no thick client.',
      '',
      'We are a small team of engineers and accountants based in the CIS, building the product we wanted for our own businesses.',
      '',
      '## Why now',
      '',
      'Russian SMBs deserve software that respects their workflows without forcing them onto fragile legacy stacks. The 1C model is brilliant; the delivery is dated. We rebuilt the delivery.',
      '',
      '## What we ship',
      '',
      "We ship continuously. Every change lands behind a flag, is tested against the 1C posting rules, and shows up on the changelog the same day. There is no annual contract because we don't need to lock you in to keep you.",
    ].join('\n'),
  },
  ru: {
    body: [
      '# О ishflow',
      '',
      'ishflow — это дисциплина 1С:Предприятие (Справочники, Документы, Регистры, проведение), реализованная как современный SaaS. Без серверов на Windows, без лицензий на рабочее место, без толстого клиента.',
      '',
      'Мы — небольшая команда инженеров и бухгалтеров из СНГ, строим продукт, который сами хотели использовать в своих компаниях.',
      '',
      '## Почему сейчас',
      '',
      'Малый бизнес в СНГ заслуживает софт, который уважает его процессы — без зависимости от устаревшего стека. Модель 1С прекрасна; способ её поставки устарел. Мы пересобрали способ поставки.',
      '',
      '## Что мы делаем',
      '',
      'Мы релизим непрерывно. Каждое изменение — за флагом, проверено на правилах проведения 1С, и в тот же день появляется в истории изменений. Годовых контрактов нет — нам не нужно вас удерживать, нам нужно, чтобы вам было хорошо.',
    ].join('\n'),
  },
  tr: {
    body: [
      '# ishflow Hakkında',
      '',
      'ishflow, 1C:Enterprise disiplinini (Katalog, Belge, Kayıt, posting) modern bir SaaS olarak sunar. Windows sunucu yok, koltuk başı lisans yok, kalın istemci yok.',
      '',
      'BDT bölgesindeki küçük bir mühendis ve muhasebeci ekibi — kendi şirketlerimiz için istediğimiz ürünü inşa ediyoruz.',
      '',
      '## Neden şimdi',
      '',
      "KOBİ'ler iş akışlarına saygı duyan yazılımı hak ediyor — eski teknoloji yığınlarına mecbur kalmadan. 1C modeli mükemmel; teslim biçimi eski. Biz teslim biçimini yeniden kurduk.",
      '',
      '## Sürekli teslimat',
      '',
      "Her değişiklik flag arkasında, 1C posting kurallarına karşı test edilmiş ve aynı gün changelog'ta. Sizi tutmamız gerekmediği için yıllık sözleşme yok.",
    ].join('\n'),
  },
};

const PRIVACY_BODY: Record<DefaultLocale, MarkdownContent> = {
  en: {
    body: [
      '# Privacy Policy',
      '',
      'Effective date: 2026-05-13.',
      '',
      'This policy explains what data ishflow collects, why, and what your rights are. Plain language. No tracking cookies on the public site.',
      '',
      '## Data we collect',
      '',
      '- Account data: email, name, organization name.',
      '- Business data: anything you enter into your workspace.',
      '- Diagnostic data: anonymous error reports and aggregate usage.',
      '',
      '## Data we do NOT collect',
      '',
      '- We do not sell your data.',
      '- We do not use third-party advertising cookies on the marketing site.',
      '- We do not train AI models on your business data.',
      '',
      '## Your rights',
      '',
      'You can export, correct, or delete your data at any time from Settings > Account. Email privacy@ishflow.com for any other requests.',
    ].join('\n'),
  },
  ru: {
    body: [
      '# Политика конфиденциальности',
      '',
      'Дата вступления в силу: 2026-05-13.',
      '',
      'Эта политика объясняет, какие данные собирает ishflow и зачем. Простым языком. На публичном сайте — никаких трекинговых cookie.',
      '',
      '## Что мы собираем',
      '',
      '- Данные аккаунта: email, имя, название организации.',
      '- Бизнес-данные: всё, что вы вводите в рабочее пространство.',
      '- Диагностика: анонимные ошибки и агрегированная статистика.',
      '',
      '## Что мы НЕ делаем',
      '',
      '- Не продаём ваши данные.',
      '- Не используем сторонние рекламные cookie на маркетинговом сайте.',
      '- Не обучаем ИИ на ваших бизнес-данных.',
      '',
      '## Ваши права',
      '',
      'Вы в любой момент можете выгрузить, исправить или удалить данные из «Настройки → Аккаунт». Для остальных вопросов: privacy@ishflow.com.',
    ].join('\n'),
  },
  tr: {
    body: [
      '# Gizlilik Politikası',
      '',
      'Yürürlük tarihi: 2026-05-13.',
      '',
      "ishflow'un hangi veriyi neden topladığını açıklayan kısa metin. Kamu sitesinde takip çerezi yoktur.",
      '',
      '## Topladığımız veri',
      '',
      '- Hesap verisi: e-posta, ad, şirket adı.',
      '- İş verisi: çalışma alanına girdiğiniz her şey.',
      '- Tanılayıcı veri: anonim hata raporları ve toplu kullanım.',
      '',
      '## Yapmadığımız şeyler',
      '',
      '- Verinizi satmayız.',
      '- Pazarlama sitesinde üçüncü-taraf reklam çerezi kullanmayız.',
      '- AI modellerini iş verinizle eğitmeyiz.',
      '',
      '## Haklarınız',
      '',
      'Ayarlar > Hesap üzerinden istediğiniz zaman veri indirebilir, düzeltebilir veya silebilirsiniz. Diğer talepler için: privacy@ishflow.com.',
    ].join('\n'),
  },
};

const TERMS_BODY: Record<DefaultLocale, MarkdownContent> = {
  en: {
    body: [
      '# Terms of Service',
      '',
      'By using ishflow you agree to these terms. Plain language. Updated 2026-05-13.',
      '',
      '## Service',
      '',
      'We provide a multi-tenant SaaS for business accounting and operations. The free tier is provided as-is. Paid tiers carry a 99.9% uptime SLA on Business and above.',
      '',
      '## Acceptable use',
      '',
      '- No illegal content. No spam. No abuse of other tenants.',
      "- Do not attempt to access other tenants' data; tenant isolation is enforced by PostgreSQL RLS, but we still log and prosecute attempts.",
      '',
      '## Payment',
      '',
      'Paid plans bill monthly or annually via Stripe. Cancel any time. Refunds for annual plans are pro-rated.',
      '',
      '## Termination',
      '',
      'We can suspend accounts that violate acceptable use. You can export and delete your data at any time before termination.',
    ].join('\n'),
  },
  ru: {
    body: [
      '# Условия использования',
      '',
      'Используя ishflow, вы соглашаетесь с этими условиями. Простым языком. Обновлено 2026-05-13.',
      '',
      '## Сервис',
      '',
      'Мы предоставляем мультитенантный SaaS для бухгалтерии и операций. Free-тариф — «как есть». На тарифах Business и выше — SLA 99.9%.',
      '',
      '## Допустимое использование',
      '',
      '- Никакого незаконного контента. Никакого спама. Никаких атак на других тенантов.',
      '- Не пытайтесь получить доступ к данным других тенантов; изоляция обеспечивается RLS Postgres, но мы фиксируем и реагируем на любые попытки.',
      '',
      '## Оплата',
      '',
      'Платные тарифы — ежемесячно или ежегодно через Stripe. Отмена в любой момент. Возврат по годовым тарифам — пропорциональный.',
      '',
      '## Прекращение',
      '',
      'Мы можем приостановить аккаунт за нарушения. Вы в любой момент можете экспортировать и удалить данные.',
    ].join('\n'),
  },
  tr: {
    body: [
      '# Hizmet Şartları',
      '',
      "ishflow'u kullanarak bu şartları kabul edersiniz. Sade dil. 2026-05-13 güncellendi.",
      '',
      '## Hizmet',
      '',
      'Muhasebe ve operasyon için çoklu kiracı SaaS. Free plan "olduğu gibi" sunulur. Business ve üzeri %99.9 uptime SLA sağlar.',
      '',
      '## Kabul edilebilir kullanım',
      '',
      '- Yasadışı içerik yok. Spam yok. Diğer kiracılara saldırı yok.',
      '- Başka kiracıların verisine erişmeye çalışmayın; PostgreSQL RLS izolasyon sağlasa da girişimler loglanır ve yasal işlem yapılır.',
      '',
      '## Ödeme',
      '',
      'Ücretli planlar Stripe üzerinden aylık veya yıllık. İstediğiniz zaman iptal edin. Yıllık plan iadeleri orantılıdır.',
      '',
      '## Fesih',
      '',
      'İhlallerde hesabı askıya alabiliriz. Fesihten önce her zaman veri ihracı ve silme yapabilirsiniz.',
    ].join('\n'),
  },
};

const SECURITY_BODY: Record<DefaultLocale, MarkdownContent> = {
  en: {
    body: [
      '# Security',
      '',
      'Security at ishflow is not a feature — it is the foundation. Highlights below.',
      '',
      '## Tenant isolation',
      '',
      'Every tenant-scoped query runs under PostgreSQL Row-Level Security. Cross-tenant access is impossible at the database layer, not just the application layer. A non-privileged runtime role enforces this — a startup guard refuses to boot on a bypass-capable role.',
      '',
      '## Encryption',
      '',
      'TLS in transit, AES-256 at rest. Daily backups, encrypted, with point-in-time recovery on Business+.',
      '',
      '## Audit',
      '',
      'Every mutation is recorded in an immutable audit log with tenant_id, user_id, before/after diff. Visible to admins in /admin/audit.',
      '',
      '## Authentication',
      '',
      'Clerk-backed: passwordless, social, SSO on Enterprise. JWT-bridged for mobile clients.',
      '',
      '## Disclosure',
      '',
      'Report vulnerabilities to security@ishflow.com. We acknowledge within 48 hours.',
    ].join('\n'),
  },
  ru: {
    body: [
      '# Безопасность',
      '',
      'Безопасность в ishflow — это не опция, а фундамент.',
      '',
      '## Изоляция тенантов',
      '',
      'Все запросы выполняются под PostgreSQL RLS. Доступ к данным другого тенанта невозможен на уровне БД, а не только приложения. Сервер стартует только под непривилегированной ролью — guard на старте проверяет это.',
      '',
      '## Шифрование',
      '',
      'TLS при передаче, AES-256 при хранении. Ежедневные шифрованные бэкапы; point-in-time recovery на тарифе Business+.',
      '',
      '## Аудит',
      '',
      'Каждая мутация фиксируется в неизменяемом журнале (tenant_id, user_id, diff). Доступно админам в /admin/audit.',
      '',
      '## Аутентификация',
      '',
      'Через Clerk: passwordless, соцсети, SSO на Enterprise. Для мобильных клиентов — JWT-мост.',
      '',
      '## Раскрытие',
      '',
      'Сообщения об уязвимостях — security@ishflow.com. Подтверждение в течение 48 часов.',
    ].join('\n'),
  },
  tr: {
    body: [
      '# Güvenlik',
      '',
      "ishflow'da güvenlik bir özellik değil, temeldir.",
      '',
      '## Kiracı izolasyonu',
      '',
      "Tüm sorgular PostgreSQL Row-Level Security altında çalışır. Kiracılar arası erişim DB seviyesinde imkansızdır. Sunucu sadece bypass-yeteneksiz bir rolle açılır — başlangıç guard'ı bunu doğrular.",
      '',
      '## Şifreleme',
      '',
      'TLS aktarımda, AES-256 saklanırken. Günlük şifreli yedekler; Business+ planında point-in-time recovery.',
      '',
      '## Audit',
      '',
      "Her mutasyon değişmez bir audit log'a yazılır (tenant_id, user_id, diff). Adminler /admin/audit altında görebilir.",
      '',
      '## Kimlik doğrulama',
      '',
      "Clerk: şifresiz, sosyal, Enterprise'da SSO. Mobil için JWT köprüsü.",
      '',
      '## Açıklama',
      '',
      'Güvenlik açıklarını security@ishflow.com adresine bildirin. 48 saat içinde dönüş.',
    ].join('\n'),
  },
};

const CHANGELOG_BODY: Record<DefaultLocale, MarkdownContent> = {
  en: {
    body: [
      '# Changelog',
      '',
      'A running log of what shipped. SA can override this page from the CMS.',
      '',
      '## 2026-05-13',
      '',
      '- Marketing site launch — public pages, blog, pricing, contact.',
      '- Premium add-on system (12 add-ons, AI invoice OCR & bank import in beta).',
      '- Operational email notifications + per-tenant toggles.',
      '- Marketplace integration recipes for Wildberries, Ozon, Kaspi.',
      '- CSV/Excel bulk import for customers, products, opening inventory.',
      '- Onboarding wizard + 5-step setup checklist.',
      '- Performance pass: composite indexes, shared transactions, parallelization.',
      '',
      '## 2026-05-12',
      '',
      '- Super Admin Console (operator-only).',
      '- Subscription system (Stripe Checkout + Portal).',
      '- Apple Sign In for iOS, account deletion.',
      '',
      '## 2026-05-11',
      '',
      '- Android native MVP reached iOS parity.',
      '- iOS onboarding flow with demo workspace.',
    ].join('\n'),
  },
  ru: {
    body: [
      '# История изменений',
      '',
      'Что вышло. Эта страница редактируется из CMS суперадмином.',
      '',
      '## 2026-05-13',
      '',
      '- Запуск маркетингового сайта — публичные страницы, блог, тарифы, контакты.',
      '- Система премиум-аддонов (12 аддонов, OCR счетов и импорт банковских выписок — в бете).',
      '- Операционные email-уведомления + переключатели на уровне тенанта.',
      '- Рецепты интеграции с Wildberries, Ozon, Kaspi.',
      '- Массовый импорт CSV/Excel: контрагенты, товары, начальные остатки.',
      '- Онбординг-мастер и чек-лист из 5 шагов.',
      '- Оптимизация производительности.',
      '',
      '## 2026-05-12',
      '',
      '- Консоль суперадмина.',
      '- Подписки (Stripe Checkout + Portal).',
      '- Apple Sign In для iOS, удаление аккаунта.',
      '',
      '## 2026-05-11',
      '',
      '- Android-приложение достигло паритета с iOS.',
      '- Онбординг iOS с демо-пространством.',
    ].join('\n'),
  },
  tr: {
    body: [
      '# Changelog',
      '',
      "Yayınlanan değişikliklerin günlüğü. Süper admin CMS'ten bu sayfayı override edebilir.",
      '',
      '## 2026-05-13',
      '',
      '- Pazarlama sitesi yayında — public sayfalar, blog, fiyatlandırma, iletişim.',
      '- Premium eklenti sistemi (12 eklenti, AI fatura OCR ve banka içe aktarımı beta).',
      '- Operasyonel e-posta bildirimleri + kiracı bazlı toggle.',
      '- Wildberries, Ozon, Kaspi pazaryeri tarifleri.',
      '- Toplu CSV/Excel içe aktarımı.',
      '- Onboarding sihirbazı.',
      '- Performans iyileştirmeleri.',
      '',
      '## 2026-05-12',
      '',
      '- Süper Admin Konsolu.',
      '- Abonelik sistemi.',
      '- iOS için Apple ile Giriş + hesap silme.',
      '',
      '## 2026-05-11',
      '',
      '- Android native MVP iOS paritesi.',
      '- iOS onboarding akışı.',
    ].join('\n'),
  },
};

const ROADMAP_BODY: Record<DefaultLocale, MarkdownContent> = {
  en: {
    body: [
      '# Roadmap',
      '',
      'What we are working on next. Subject to change.',
      '',
      '## Now',
      '',
      '- 1C 8.3 direct connector (read-only sync of catalogs).',
      '- Telegram bot for order notifications and revenue digest.',
      '- Marketplace sync GA (Wildberries / Ozon / Kaspi).',
      '',
      '## Next',
      '',
      '- ESF Kazakhstan e-invoice submission.',
      '- 54-FZ online cash register (ОФД) integration.',
      '- Multi-company consolidation reports.',
      '- B2B customer portal (self-serve orders + statements).',
      '',
      '## Later',
      '',
      '- AI natural-language reporting ("show me last quarter\'s top customers in Russia").',
      '- Chestny Znak marking (tobacco, shoes, dairy).',
      '- Inventory forecasting.',
    ].join('\n'),
  },
  ru: {
    body: [
      '# Дорожная карта',
      '',
      'Над чем мы работаем дальше. Может меняться.',
      '',
      '## Сейчас',
      '',
      '- Прямой коннектор 1С 8.3 (синхронизация справочников).',
      '- Telegram-бот: заказы и дайджест выручки.',
      '- Маркетплейс-синхронизация GA (Wildberries / Ozon / Kaspi).',
      '',
      '## Дальше',
      '',
      '- ЭСФ Казахстан.',
      '- Касса 54-ФЗ через ОФД.',
      '- Консолидация по группе компаний.',
      '- B2B-портал для покупателей (самостоятельные заказы и выписки).',
      '',
      '## Позже',
      '',
      '- ИИ-отчётность на естественном языке.',
      '- Маркировка «Честный Знак».',
      '- Прогноз остатков.',
    ].join('\n'),
  },
  tr: {
    body: [
      '# Yol haritası',
      '',
      'Üzerinde çalıştığımız şeyler. Değişebilir.',
      '',
      '## Şimdi',
      '',
      '- 1C 8.3 doğrudan konektör.',
      '- Sipariş bildirimleri için Telegram bot.',
      '- Pazaryeri eşitleme GA.',
      '',
      '## Sonra',
      '',
      '- Kazakistan ESF.',
      '- 54-FZ kasa.',
      '- Çok şirketli konsolidasyon.',
      '- B2B müşteri portalı.',
      '',
      '## İleride',
      '',
      '- Doğal dil raporlama.',
      '- Chestny Znak markalama.',
      '- Stok tahmini.',
    ].join('\n'),
  },
};

const PRICING_FAQ: Record<DefaultLocale, FaqContent> = {
  en: {
    items: [
      {
        q: 'Can I change plans?',
        a: 'Yes, at any time. On upgrade you top up the difference for the remainder of the month. On downgrade you get a credit toward the next month.',
      },
      {
        q: 'Which payment methods do you accept?',
        a: 'For companies: invoice with or without VAT, EDI through Diadoc/Kontur. For individuals and sole proprietors: bank cards, SBP, YooMoney. We do not accept crypto yet.',
      },
      {
        q: 'Is there a discount for education and non-profits?',
        a: 'Yes, 30% indefinitely on the Pro plan. Email us from a corporate address and we will send a promo code.',
      },
      {
        q: 'What happens if I miss a payment?',
        a: "Access to your data is preserved for 30 days. You can still log in, export everything and decide what's next at your own pace. No blocks 'in the middle of quarter close'.",
      },
      {
        q: 'Is there an on-premise version?',
        a: 'Yes, for Business. Deployed to your infrastructure or a dedicated VPC. Pricing starts at 350,000 ₽/year and is discussed individually.',
      },
      {
        q: 'Can I use it in KZ / UZ / KG?',
        a: 'Yes. Billing in the local currency; printable forms and reporting follow the rules of the relevant jurisdiction.',
      },
    ],
  },
  ru: {
    items: [
      {
        q: 'Можно ли менять тариф?',
        a: 'Да, в любой момент. При повышении — доплатите разницу за остаток месяца. При понижении — кредит на следующий месяц.',
      },
      {
        q: 'Какие способы оплаты?',
        a: 'Юрлица: по счёту с НДС или без, ЭДО через Диадок/Контур. Физлица и ИП: банковские карты, СБП, ЮMoney. Криптовалюту пока не принимаем.',
      },
      {
        q: 'Есть ли скидка для образования и НКО?',
        a: 'Да, 30% бессрочно на тариф Pro. Напишите нам с корпоративной почты — пришлём промокод.',
      },
      {
        q: 'Что будет, если просрочить оплату?',
        a: 'Доступ к данным сохраняется 30 дней. Можно зайти, выгрузить всё, не торопясь решить, что дальше. Никаких блокировок «среди закрытия квартала».',
      },
      {
        q: 'Есть ли on-premise версия?',
        a: 'Да, для Business. Установка в вашу инфраструктуру или в выделенный VPC. Стоимость от 350 000 ₽/год, обсуждается индивидуально.',
      },
      {
        q: 'Можно ли пользоваться в РК/УЗ/КГ?',
        a: 'Да. Биллинг в местной валюте, печатные формы и отчётность — по правилам соответствующей юрисдикции.',
      },
    ],
  },
  tr: {
    items: [
      {
        q: 'Plan değiştirebilir miyim?',
        a: 'Evet, istediğiniz an. Yükseltirken ayın kalan süresi için farkı ödersiniz. Düşürdüğünüzde bir sonraki aya kredi olarak yansır.',
      },
      {
        q: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?',
        a: "Tüzel kişiler için: KDV'li veya KDV'siz fatura, Diadoc/Kontur üzerinden EDI. Bireyler ve şahıs şirketleri için: banka kartı, SBP, YooMoney. Şimdilik kripto kabul etmiyoruz.",
      },
      {
        q: 'Eğitim ve STK için indirim var mı?',
        a: 'Evet, Pro planda süresiz %30. Kurumsal e-postanızdan yazın, promo kod gönderelim.',
      },
      {
        q: 'Ödeme gecikirse ne olur?',
        a: "Verinize erişim 30 gün boyunca korunur. Giriş yapıp her şeyi indirebilir, sonraki adımı acele etmeden kararlaştırabilirsiniz. 'Çeyrek kapanışının ortasında' bloklama yoktur.",
      },
      {
        q: 'On-premise sürüm var mı?',
        a: "Evet, Business planı için. Kendi altyapınıza veya özel bir VPC'ye kurulur. Yıllık 350 000 ₽'den başlar, bireysel görüşülür.",
      },
      {
        q: 'KZ / UZ / KG’de kullanabilir miyim?',
        a: 'Evet. Yerel para biriminde faturalama; basılı formlar ve raporlama ilgili yargı bölgesinin kurallarına göredir.',
      },
    ],
  },
};

const HOME_STATS: Record<DefaultLocale, StatsStripContent> = {
  en: {
    items: [
      { value: '1,200+', label: 'companies on the platform' },
      { value: '8 languages', label: 'interface localisation' },
      { value: '99.9%', label: 'uptime over 12 months' },
      { value: '14 days', label: 'trial — no card needed' },
    ],
  },
  ru: {
    items: [
      { value: '1 200+', label: 'Компаний на платформе' },
      { value: '8 языков', label: 'Локализация интерфейса' },
      { value: '99.9%', label: 'Аптайм за 12 месяцев' },
      { value: '14 дней', label: 'Триал без карты' },
    ],
  },
  tr: {
    items: [
      { value: '1 200+', label: 'platformdaki şirketler' },
      { value: '8 dil', label: 'arayüz yerelleştirmesi' },
      { value: '99.9%', label: '12 ay uptime' },
      { value: '14 gün', label: 'kartsız deneme' },
    ],
  },
};

const HOME_SHOWCASE: Record<DefaultLocale, ShowcaseContent> = {
  en: {
    eyebrow: 'From intent to posting',
    headline: 'Catalogs. Documents. Reports.',
    body: 'Describe the task. The AI agent drafts the documents. You review and post.',
    labels: ['Catalogs', 'Documents', 'Reports'],
  },
  ru: {
    eyebrow: 'От намерения к посту',
    headline: 'Каталоги. Документы. Отчёты.',
    body: 'Опишите задачу. AI-агент готовит документы. Вы проверяете и проводите.',
    labels: ['Каталоги', 'Документы', 'Отчёты'],
  },
  tr: {
    eyebrow: 'Niyetten kayda',
    headline: 'Kataloglar. Belgeler. Raporlar.',
    body: 'Görevi anlatın. AI ajanı belgeleri hazırlar. Siz kontrol edip post edersiniz.',
    labels: ['Kataloglar', 'Belgeler', 'Raporlar'],
  },
};

const PRICING_TABLE: Record<DefaultLocale, PricingTableContent> = {
  en: {
    yearlyDiscountPct: 20,
    tiers: [
      {
        id: 'free',
        name: 'Free',
        price: '0 ₽',
        priceSub: '/mo',
        desc: 'For freelancers and micro-business. No time limit.',
        features: ['1 user', '1 organisation', 'Up to 50 documents/mo', 'Basic reports'],
        ctaLabel: 'Start free',
        ctaHref: '/sign-up',
      },
      {
        id: 'starter',
        name: 'Starter',
        price: '1,490 ₽',
        priceSub: '/mo',
        desc: 'For a team of up to 5 people.',
        features: ['5 users', '2 organisations', 'Unlimited documents', 'All base modules'],
        ctaLabel: 'Try it',
        ctaHref: '/sign-up',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '4,990 ₽',
        priceSub: '/mo',
        featured: true,
        desc: 'The most common choice. For growing SMBs.',
        features: [
          '20 users',
          '10 organisations',
          'Warehouse + batches',
          'API + integrations',
          'Priority support',
        ],
        ctaLabel: 'Try it',
        ctaHref: '/sign-up',
      },
      {
        id: 'business',
        name: 'Business',
        price: 'from 14,900 ₽',
        priceSub: '/mo',
        desc: 'For companies of 50+ with several legal entities.',
        features: [
          'Unlimited users',
          'Unlimited organisations',
          'SSO + audit',
          'Dedicated manager',
          'SLA 99.95%',
        ],
        ctaLabel: 'Contact us',
        ctaHref: '/contact',
      },
    ],
  },
  ru: {
    yearlyDiscountPct: 20,
    tiers: [
      {
        id: 'free',
        name: 'Free',
        price: '0 ₽',
        priceSub: '/мес',
        desc: 'Для самозанятых и микро-бизнеса. Без срока.',
        features: ['1 пользователь', '1 организация', 'До 50 документов/мес', 'Базовые отчёты'],
        ctaLabel: 'Начать бесплатно',
        ctaHref: '/sign-up',
      },
      {
        id: 'starter',
        name: 'Starter',
        price: '1 490 ₽',
        priceSub: '/мес',
        desc: 'Для команды до 5 человек.',
        features: ['5 пользователей', '2 организации', 'Безлимит документов', 'Все базовые модули'],
        ctaLabel: 'Попробовать',
        ctaHref: '/sign-up',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '4 990 ₽',
        priceSub: '/мес',
        featured: true,
        desc: 'Самый частый выбор. Для растущих SMB.',
        features: [
          '20 пользователей',
          '10 организаций',
          'Складской учёт + партии',
          'API + интеграции',
          'Приоритетная поддержка',
        ],
        ctaLabel: 'Попробовать',
        ctaHref: '/sign-up',
      },
      {
        id: 'business',
        name: 'Business',
        price: 'от 14 900 ₽',
        priceSub: '/мес',
        desc: 'Для компаний 50+ человек с несколькими юрлицами.',
        features: [
          'Безлимит пользователей',
          'Безлимит организаций',
          'SSO + аудит',
          'Выделенный менеджер',
          'SLA 99.95%',
        ],
        ctaLabel: 'Связаться',
        ctaHref: '/contact',
      },
    ],
  },
  tr: {
    yearlyDiscountPct: 20,
    tiers: [
      {
        id: 'free',
        name: 'Free',
        price: '0 ₽',
        priceSub: '/ay',
        desc: 'Serbest çalışanlar ve mikro işletmeler için. Süresiz.',
        features: ['1 kullanıcı', '1 organizasyon', 'Aylık 50 belgeye kadar', 'Temel raporlar'],
        ctaLabel: 'Ücretsiz başla',
        ctaHref: '/sign-up',
      },
      {
        id: 'starter',
        name: 'Starter',
        price: '1 490 ₽',
        priceSub: '/ay',
        desc: '5 kişiye kadar takımlar için.',
        features: ['5 kullanıcı', '2 organizasyon', 'Sınırsız belge', 'Tüm temel modüller'],
        ctaLabel: 'Dene',
        ctaHref: '/sign-up',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '4 990 ₽',
        priceSub: '/ay',
        featured: true,
        desc: "Büyüyen KOBİ'ler için en sık tercih.",
        features: [
          '20 kullanıcı',
          '10 organizasyon',
          'Depo + partiler',
          'API + entegrasyonlar',
          'Öncelikli destek',
        ],
        ctaLabel: 'Dene',
        ctaHref: '/sign-up',
      },
      {
        id: 'business',
        name: 'Business',
        price: '14 900 ₽’den',
        priceSub: '/ay',
        desc: 'Birden fazla tüzel kişisi olan 50+ kişilik şirketler için.',
        features: [
          'Sınırsız kullanıcı',
          'Sınırsız organizasyon',
          'SSO + audit',
          'Özel müdür',
          'SLA 99.95%',
        ],
        ctaLabel: 'Bizimle iletişime geç',
        ctaHref: '/contact',
      },
    ],
  },
};

const PRICING_COMPARISON: Record<DefaultLocale, PricingComparisonContent> = {
  en: {
    tierNames: ['Free', 'Starter', 'Pro', 'Business'],
    tierPrices: ['0 ₽/mo', '1,490 ₽/mo', '4,990 ₽/mo', 'from 14,900 ₽/mo'],
    sections: [
      {
        section: 'Core accounting',
        rows: [
          { feature: 'Users', values: ['1', '5', '20', '∞'] },
          { feature: 'Organisations (legal entities)', values: ['1', '2', '10', '∞'] },
          { feature: 'Documents per month', values: ['50', '∞', '∞', '∞'] },
          { feature: 'Catalogs: counterparties, products', values: [true, true, true, true] },
          { feature: 'Sales, receipts, acts, UPD', values: [true, true, true, true] },
          { feature: 'Basic reports (TB, cash flow)', values: [true, true, true, true] },
        ],
      },
      {
        section: 'Warehouse & finance',
        rows: [
          { feature: 'Warehouse + batches', values: [false, 'Basic', true, true] },
          { feature: 'Multiple warehouses', values: [false, 'Up to 2', true, true] },
          { feature: 'Serials / expiry tracking', values: [false, false, true, true] },
          { feature: 'Cash book & payments', values: [true, true, true, true] },
          { feature: 'Multi-currency', values: [false, true, true, true] },
        ],
      },
      {
        section: 'Integrations & API',
        rows: [
          { feature: 'Bank statement import', values: [false, '1 bank', '5 banks', '∞'] },
          { feature: 'Open REST API', values: [false, '100/hr', '10k/hr', '∞'] },
          { feature: 'Webhooks', values: [false, false, true, true] },
          { feature: 'SSO (Google, Microsoft, SAML)', values: [false, false, false, true] },
        ],
      },
      {
        section: 'Support & SLA',
        rows: [
          { feature: 'Chat support', values: [true, true, true, true] },
          { feature: 'Priority support', values: [false, false, true, true] },
          { feature: 'Dedicated manager', values: [false, false, false, true] },
          { feature: 'Uptime SLA', values: ['99.5%', '99.5%', '99.9%', '99.95%'] },
          { feature: 'Free data migration', values: [false, true, true, true] },
        ],
      },
    ],
  },
  ru: {
    tierNames: ['Free', 'Starter', 'Pro', 'Business'],
    tierPrices: ['0 ₽/мес', '1 490 ₽/мес', '4 990 ₽/мес', 'от 14 900 ₽/мес'],
    sections: [
      {
        section: 'Базовый учёт',
        rows: [
          { feature: 'Пользователей', values: ['1', '5', '20', '∞'] },
          { feature: 'Организаций (юрлиц)', values: ['1', '2', '10', '∞'] },
          { feature: 'Документов в месяц', values: ['50', '∞', '∞', '∞'] },
          { feature: 'Каталоги: контрагенты, номенклатура', values: [true, true, true, true] },
          { feature: 'Реализации, поступления, акты, УПД', values: [true, true, true, true] },
          { feature: 'Базовые отчёты (ОСВ, движение денег)', values: [true, true, true, true] },
        ],
      },
      {
        section: 'Склад и финансы',
        rows: [
          { feature: 'Складской учёт + партии', values: [false, 'Базовый', true, true] },
          { feature: 'Несколько складов', values: [false, 'До 2', true, true] },
          { feature: 'Учёт по сериям/срокам годности', values: [false, false, true, true] },
          { feature: 'Кассовая книга и платежи', values: [true, true, true, true] },
          { feature: 'Мульти-валюта', values: [false, true, true, true] },
        ],
      },
      {
        section: 'Интеграции и API',
        rows: [
          { feature: 'Импорт банковских выписок', values: [false, '1 банк', '5 банков', '∞'] },
          { feature: 'Открытое REST API', values: [false, '100/час', '10к/час', '∞'] },
          { feature: 'Webhooks', values: [false, false, true, true] },
          { feature: 'SSO (Google, Microsoft, SAML)', values: [false, false, false, true] },
        ],
      },
      {
        section: 'Поддержка и SLA',
        rows: [
          { feature: 'Поддержка в чате', values: [true, true, true, true] },
          { feature: 'Приоритетная поддержка', values: [false, false, true, true] },
          { feature: 'Выделенный менеджер', values: [false, false, false, true] },
          { feature: 'SLA на аптайм', values: ['99.5%', '99.5%', '99.9%', '99.95%'] },
          { feature: 'Перенос данных бесплатно', values: [false, true, true, true] },
        ],
      },
    ],
  },
  tr: {
    tierNames: ['Free', 'Starter', 'Pro', 'Business'],
    tierPrices: ['0 ₽/ay', '1 490 ₽/ay', '4 990 ₽/ay', '14 900 ₽/aydan'],
    sections: [
      {
        section: 'Temel muhasebe',
        rows: [
          { feature: 'Kullanıcı', values: ['1', '5', '20', '∞'] },
          { feature: 'Organizasyon (tüzel kişi)', values: ['1', '2', '10', '∞'] },
          { feature: 'Aylık belge', values: ['50', '∞', '∞', '∞'] },
          { feature: 'Kataloglar: cari, ürün', values: [true, true, true, true] },
          { feature: 'Satış, alım, irsaliye, UPD', values: [true, true, true, true] },
          { feature: 'Temel raporlar (mizan, nakit akışı)', values: [true, true, true, true] },
        ],
      },
      {
        section: 'Depo ve finans',
        rows: [
          { feature: 'Depo + parti', values: [false, 'Temel', true, true] },
          { feature: 'Birden fazla depo', values: [false, '2 adede kadar', true, true] },
          { feature: 'Seri / son kullanma takibi', values: [false, false, true, true] },
          { feature: 'Kasa defteri ve ödemeler', values: [true, true, true, true] },
          { feature: 'Çoklu para birimi', values: [false, true, true, true] },
        ],
      },
      {
        section: 'Entegrasyonlar ve API',
        rows: [
          { feature: 'Banka ekstresi içe aktarımı', values: [false, '1 banka', '5 banka', '∞'] },
          { feature: 'Açık REST API', values: [false, '100/saat', '10k/saat', '∞'] },
          { feature: 'Webhook', values: [false, false, true, true] },
          { feature: 'SSO (Google, Microsoft, SAML)', values: [false, false, false, true] },
        ],
      },
      {
        section: 'Destek ve SLA',
        rows: [
          { feature: 'Sohbet desteği', values: [true, true, true, true] },
          { feature: 'Öncelikli destek', values: [false, false, true, true] },
          { feature: 'Özel müdür', values: [false, false, false, true] },
          { feature: 'Uptime SLA', values: ['99.5%', '99.5%', '99.9%', '99.95%'] },
          { feature: 'Ücretsiz veri taşıma', values: [false, true, true, true] },
        ],
      },
    ],
  },
};

const PRICING_ADDONS: Record<DefaultLocale, AddonSpotlightContent> = {
  en: {
    headline: 'Paid add-ons — by subscription.',
    body: 'Connect and disconnect with a click. Pay only for what you actually used this month.',
    items: [
      { addonKey: 'ai_invoice_ocr', tag: 'AI', price: 'from 990 ₽/mo' },
      { addonKey: 'bank_integration', tag: 'Finance', price: 'included with Pro' },
      { addonKey: 'kkt_54fz', tag: 'Cash desk', price: 'from 1,490 ₽/mo' },
      { addonKey: 'edo_integration', tag: 'EDI', price: 'from 690 ₽/mo' },
      { addonKey: 'marketplace_sync', tag: 'Logistics', price: 'from 1,290 ₽/mo' },
      { addonKey: 'telegram_bot', tag: 'EDI', price: 'included' },
      { addonKey: 'marking_chestny_znak', tag: 'Logistics', price: 'from 1,690 ₽/mo' },
      { addonKey: 'esf_kazakhstan', tag: 'EDI', price: 'from 2,490 ₽/mo' },
    ],
  },
  ru: {
    headline: 'Платные расширения — по подписке.',
    body: 'Подключайте и отключайте по щелчку. Платите только за то, что реально используете в этом месяце.',
    items: [
      { addonKey: 'ai_invoice_ocr', tag: 'AI', price: 'от 990 ₽/мес' },
      { addonKey: 'bank_integration', tag: 'Финансы', price: 'включено в Pro' },
      { addonKey: 'kkt_54fz', tag: 'Касса', price: 'от 1 490 ₽/мес' },
      { addonKey: 'edo_integration', tag: 'ЭДО', price: 'от 690 ₽/мес' },
      { addonKey: 'marketplace_sync', tag: 'Логистика', price: 'от 1 290 ₽/мес' },
      { addonKey: 'telegram_bot', tag: 'ЭДО', price: 'включено' },
      { addonKey: 'marking_chestny_znak', tag: 'Логистика', price: 'от 1 690 ₽/мес' },
      { addonKey: 'esf_kazakhstan', tag: 'ЭДО', price: 'от 2 490 ₽/мес' },
    ],
  },
  tr: {
    headline: 'Ücretli eklentiler — abonelikle.',
    body: 'Tek tıkla bağlayın ve ayırın. Sadece o ay gerçekten kullandığınızı ödeyin.',
    items: [
      { addonKey: 'ai_invoice_ocr', tag: 'AI', price: '990 ₽/aydan' },
      { addonKey: 'bank_integration', tag: 'Finans', price: "Pro'ya dahil" },
      { addonKey: 'kkt_54fz', tag: 'Kasa', price: '1 490 ₽/aydan' },
      { addonKey: 'edo_integration', tag: 'EDI', price: '690 ₽/aydan' },
      { addonKey: 'marketplace_sync', tag: 'Lojistik', price: '1 290 ₽/aydan' },
      { addonKey: 'telegram_bot', tag: 'EDI', price: 'dahil' },
      { addonKey: 'marking_chestny_znak', tag: 'Lojistik', price: '1 690 ₽/aydan' },
      { addonKey: 'esf_kazakhstan', tag: 'EDI', price: '2 490 ₽/aydan' },
    ],
  },
};

interface DefaultEntry {
  pageKey: string;
  sectionKey: string;
  byLocale: Record<DefaultLocale, SectionContent>;
}

const DEFAULTS: readonly DefaultEntry[] = [
  { pageKey: 'home', sectionKey: 'hero', byLocale: HOME_HERO },
  { pageKey: 'home', sectionKey: 'social_proof', byLocale: HOME_SOCIAL_PROOF },
  { pageKey: 'home', sectionKey: 'stats', byLocale: HOME_STATS },
  { pageKey: 'home', sectionKey: 'feature.cards', byLocale: HOME_FEATURE_CARDS },
  { pageKey: 'home', sectionKey: 'addon.spotlight', byLocale: HOME_ADDON_SPOTLIGHT },
  { pageKey: 'home', sectionKey: 'showcase', byLocale: HOME_SHOWCASE },
  { pageKey: 'home', sectionKey: 'demo', byLocale: HOME_DEMO },
  { pageKey: 'home', sectionKey: 'testimonials', byLocale: HOME_TESTIMONIALS },
  { pageKey: 'home', sectionKey: 'faq', byLocale: HOME_FAQ },
  { pageKey: 'home', sectionKey: 'cta', byLocale: HOME_CTA },
  { pageKey: 'pricing', sectionKey: 'table', byLocale: PRICING_TABLE },
  { pageKey: 'pricing', sectionKey: 'comparison', byLocale: PRICING_COMPARISON },
  { pageKey: 'pricing', sectionKey: 'addons', byLocale: PRICING_ADDONS },
  { pageKey: 'pricing', sectionKey: 'faq', byLocale: PRICING_FAQ },
  { pageKey: 'footer', sectionKey: 'columns', byLocale: FOOTER },
  { pageKey: 'about', sectionKey: 'body', byLocale: ABOUT_BODY },
  { pageKey: 'privacy', sectionKey: 'body', byLocale: PRIVACY_BODY },
  { pageKey: 'terms', sectionKey: 'body', byLocale: TERMS_BODY },
  { pageKey: 'security', sectionKey: 'body', byLocale: SECURITY_BODY },
  { pageKey: 'changelog', sectionKey: 'body', byLocale: CHANGELOG_BODY },
  { pageKey: 'roadmap', sectionKey: 'body', byLocale: ROADMAP_BODY },
] as const;

export function getDefaultSection<T extends SectionContent = SectionContent>(
  pageKey: string,
  sectionKey: string,
  locale: string,
): T | null {
  const entry = DEFAULTS.find((d) => d.pageKey === pageKey && d.sectionKey === sectionKey);
  if (!entry) return null;
  const loc = pickLocale(locale);
  return entry.byLocale[loc] as T;
}
