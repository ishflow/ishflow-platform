/**
 * Hardcoded copy for the six deep-dive feature pages.
 * Keeping this in one file keeps the pages skeletal — each `[slug]/page.tsx`
 * just looks up the slug and renders. SA can later override sections via the
 * MarketingSection CMS if needed; this is the no-DB default.
 */

export type FeatureSlug =
  | 'sales-invoicing'
  | 'inventory'
  | 'pricing-types'
  | 'document-posting'
  | 'ai-ocr'
  | 'bank-import';

export interface FeatureDetail {
  slug: FeatureSlug;
  iconKey: string;
  eyebrow: string;
  title: string;
  body: string;
  highlights: { title: string; body: string }[];
  cta: string;
}

const EN: Record<FeatureSlug, FeatureDetail> = {
  'sales-invoicing': {
    slug: 'sales-invoicing',
    iconKey: 'receipt',
    eyebrow: 'Sales',
    title: 'Sales invoicing with real posting',
    body: 'Schet-Faktura, customer balances, A/R register, partial payments — the same double-entry logic 1C operators expect, but with a UI built in this decade.',
    highlights: [
      {
        title: 'Schet-Faktura with discounts and VAT',
        body: 'Per-line discount, VAT included or excluded, customer-level price overrides via 1C-style price types.',
      },
      {
        title: 'A/R register with partial payments',
        body: 'Every invoice writes to the accounts_receivable register. Apply payments by document or balance. Aging report by customer is one query.',
      },
      {
        title: 'PDF export and email delivery',
        body: 'Tenant-branded PDF (logo, address, signature) with one click. Built-in email delivery via Resend.',
      },
    ],
    cta: 'Start free',
  },
  inventory: {
    slug: 'inventory',
    iconKey: 'warehouse',
    eyebrow: 'Inventory',
    title: 'Multi-warehouse inventory',
    body: 'Real-time stock by warehouse, transfers, low-stock alerts, opening balances via CSV. Inventory updates from sales and purchases without manual reposting.',
    highlights: [
      {
        title: 'Stock by warehouse, in real time',
        body: 'Every posted document moves the accumulation register. Stock-on-hand for any warehouse is a single read.',
      },
      {
        title: 'Transfers and adjustments',
        body: 'Inter-warehouse transfers with audit trail. Adjust counts after a stocktake with a single posted document.',
      },
      {
        title: 'CSV import for opening balances',
        body: 'Upload a spreadsheet on day one. Tenant-scoped, validated, partial rollback on row errors.',
      },
      {
        title: 'Low-stock alerts',
        body: 'Threshold per product. Email/Telegram notification when stock dips below minimum.',
      },
    ],
    cta: 'Start free',
  },
  'pricing-types': {
    slug: 'pricing-types',
    iconKey: 'tags',
    eyebrow: 'Pricing',
    title: '1C-style price types',
    body: 'Static and dynamic price types, markup formulas, customer-level overrides, period-correct resolution — the killer feature for wholesale businesses.',
    highlights: [
      {
        title: 'Static and dynamic price types',
        body: 'Static = stored prices. Dynamic = formula-based (e.g. base + 20% markup). Choose at price-type creation.',
      },
      {
        title: 'Periodic resolution',
        body: 'Price changes are time-stamped. Resolve as of any date — historical invoices stay correct.',
      },
      {
        title: 'Customer-level overrides',
        body: 'Pin a wholesale customer to the wholesale price type. Pin a partner to a contract price. Per-customer or per-tier.',
      },
      {
        title: 'Read-only price matrix',
        body: 'See product × price-type as a matrix. Filter by category. Export to CSV.',
      },
    ],
    cta: 'Start free',
  },
  'document-posting': {
    slug: 'document-posting',
    iconKey: 'file-check-2',
    eyebrow: 'Posting',
    title: 'Document posting and period close',
    body: 'Idempotent posting, period locking, audit trail on every mutation. Reverse safely. Close periods after month-end without losing access to historical data.',
    highlights: [
      {
        title: 'Idempotent posting',
        body: 'Re-posting the same document is a no-op. Crash mid-post and recover — no double-counting.',
      },
      {
        title: 'Period close',
        body: 'Lock a period (e.g. April) so no one can post or modify documents dated before the close.',
      },
      {
        title: 'Audit log on every mutation',
        body: 'Every change records tenant_id, user_id, before/after diff. Admin search by user, document, or date range.',
      },
      {
        title: 'Safe reversal',
        body: 'Unpost a document — the register entries are deleted, not negated. No phantom rows.',
      },
    ],
    cta: 'Start free',
  },
  'ai-ocr': {
    slug: 'ai-ocr',
    iconKey: 'scan-text',
    eyebrow: 'AI',
    title: 'AI invoice OCR',
    body: 'Photograph a supplier invoice. AI extracts vendor, lines, totals, VAT. Review and post — three taps. Ships as a premium add-on.',
    highlights: [
      {
        title: 'Photograph or PDF',
        body: 'Camera, gallery, or PDF upload. Multi-page invoices supported.',
      },
      {
        title: 'Lines, totals, VAT',
        body: 'Per-line product code, description, qty, unit price, VAT rate. Auto-matched to existing products by code or barcode.',
      },
      {
        title: 'Review before posting',
        body: 'AI confidence shown per field. Fix anything you do not trust before posting.',
      },
      {
        title: 'Audit on every doc',
        body: 'OCR source image is stored with the posted document for traceability.',
      },
    ],
    cta: 'Enable AI OCR',
  },
  'bank-import': {
    slug: 'bank-import',
    iconKey: 'landmark',
    eyebrow: 'Bank',
    title: 'Bank statement import',
    body: 'Sber, Tinkoff, Kaspi, 1C-Bank. Import a daily statement. Auto-match transactions to open invoices and customers. Post payment_received and payment_sent in batches.',
    highlights: [
      {
        title: 'Multi-bank parsers',
        body: 'Sber 1C, Tinkoff Business, Kaspi, 1C-Bank XML, generic CSV. Tenant chooses format.',
      },
      {
        title: 'Auto-match',
        body: 'Match by transaction memo, customer name, invoice number. Confidence score per match.',
      },
      {
        title: 'Batch post',
        body: 'Review the matches, then post all confirmed payments at once. Audit trail keeps the source statement.',
      },
      {
        title: 'A/R + A/P closure',
        body: 'Receivable and payable registers update in one transaction. Reports update immediately.',
      },
    ],
    cta: 'Enable bank import',
  },
};

const RU: Record<FeatureSlug, FeatureDetail> = {
  'sales-invoicing': {
    slug: 'sales-invoicing',
    iconKey: 'receipt',
    eyebrow: 'Продажи',
    title: 'Счета-фактуры с настоящим проведением',
    body: 'Счёт-фактура, расчёты с покупателями, регистр взаиморасчётов, частичные оплаты — та же логика двойной записи, что в 1С, но с интерфейсом из этого десятилетия.',
    highlights: [
      {
        title: 'Счёт-фактура со скидками и НДС',
        body: 'Скидка по строке, НДС в т.ч. или сверху, переопределение цены по контрагенту через типы цен в стиле 1С.',
      },
      {
        title: 'Регистр взаиморасчётов с частичными оплатами',
        body: 'Каждый счёт пишется в регистр accounts_receivable. Оплачивайте по документу или общим балансом. Возрастная разбивка по контрагенту — один запрос.',
      },
      {
        title: 'PDF и отправка по email',
        body: 'Брендированный PDF (лого, реквизиты, подпись) одной кнопкой. Встроенная отправка через Resend.',
      },
      {
        title: 'Мультивалютность с FX',
        body: 'Базовая валюта тенанта, валюты по контрагенту, периодические курсы. Отчёты сводятся корректно.',
      },
    ],
    cta: 'Начать бесплатно',
  },
  inventory: {
    slug: 'inventory',
    iconKey: 'warehouse',
    eyebrow: 'Склад',
    title: 'Учёт по складам',
    body: 'Остатки в реальном времени по каждому складу, перемещения, оповещения о низком остатке, импорт начальных остатков из CSV.',
    highlights: [
      {
        title: 'Остатки в реальном времени',
        body: 'Каждый проведённый документ двигает регистр накопления. Остаток по складу — одно чтение.',
      },
      {
        title: 'Перемещения и корректировки',
        body: 'Перемещения между складами с журналом. Корректировка после инвентаризации одним документом.',
      },
      {
        title: 'Импорт остатков из CSV',
        body: 'Загрузите таблицу в первый день. Валидация, частичный откат при ошибках.',
      },
      {
        title: 'Оповещения о низком остатке',
        body: 'Порог по товару. Email/Telegram, когда остаток меньше минимума.',
      },
    ],
    cta: 'Начать бесплатно',
  },
  'pricing-types': {
    slug: 'pricing-types',
    iconKey: 'tags',
    eyebrow: 'Цены',
    title: 'Типы цен в стиле 1С',
    body: 'Статические и динамические типы цен, формулы наценки, переопределения по контрагенту, периодическое разрешение.',
    highlights: [
      {
        title: 'Статические и динамические типы',
        body: 'Статический — сохранённые цены. Динамический — формула (например, база + 20% наценка).',
      },
      {
        title: 'Периодичность',
        body: 'Изменения цен датированы. Разрешение на любую дату — исторические счета остаются корректными.',
      },
      {
        title: 'Переопределения по контрагенту',
        body: 'Привяжите оптовика к оптовому типу. Партнёра — к договорной цене. По контрагенту или сегменту.',
      },
      {
        title: 'Матрица цен',
        body: 'Просмотр товаров × типов цен как матрица. Фильтр по категории. Экспорт CSV.',
      },
    ],
    cta: 'Начать бесплатно',
  },
  'document-posting': {
    slug: 'document-posting',
    iconKey: 'file-check-2',
    eyebrow: 'Проведение',
    title: 'Проведение и закрытие периода',
    body: 'Идемпотентное проведение, блокировка периодов, журнал на каждое изменение. Безопасная отмена.',
    highlights: [
      {
        title: 'Идемпотентное проведение',
        body: 'Повторное проведение того же документа — no-op. Сбой посреди операции — восстановление без двойного учёта.',
      },
      {
        title: 'Закрытие периода',
        body: 'Блокируйте период (например, апрель), чтобы никто не провёл и не изменил документы до закрытия.',
      },
      {
        title: 'Журнал на каждое изменение',
        body: 'Каждое изменение фиксирует tenant_id, user_id, before/after. Админский поиск по пользователю, документу, периоду.',
      },
      {
        title: 'Безопасная отмена',
        body: 'Отмена проведения удаляет записи регистра, а не сторнирует. Нет фантомных строк.',
      },
    ],
    cta: 'Начать бесплатно',
  },
  'ai-ocr': {
    slug: 'ai-ocr',
    iconKey: 'scan-text',
    eyebrow: 'ИИ',
    title: 'OCR счетов через ИИ',
    body: 'Сфотографируйте счёт. ИИ извлекает поставщика, строки, итоги, НДС. Проверьте и проведите — три касания. Премиум-аддон.',
    highlights: [
      {
        title: 'Фото или PDF',
        body: 'Камера, галерея или загрузка PDF. Поддержка многостраничных счетов.',
      },
      {
        title: 'Строки, итоги, НДС',
        body: 'Код товара, описание, кол-во, цена, ставка НДС по каждой строке. Авто-сопоставление по коду или штрихкоду.',
      },
      {
        title: 'Проверка перед проведением',
        body: 'Уверенность ИИ по каждому полю. Исправьте всё, чему не доверяете.',
      },
      {
        title: 'Аудит на каждый документ',
        body: 'Исходное изображение хранится с проведённым документом.',
      },
    ],
    cta: 'Включить OCR',
  },
  'bank-import': {
    slug: 'bank-import',
    iconKey: 'landmark',
    eyebrow: 'Банк',
    title: 'Импорт банковских выписок',
    body: 'Сбер, Тинькофф, Kaspi, 1С-Банк. Импортируйте дневную выписку. Автосопоставление с открытыми счетами и контрагентами.',
    highlights: [
      {
        title: 'Парсеры под разные банки',
        body: 'Сбер 1С, Тинькофф Бизнес, Kaspi, 1С-Банк XML, общий CSV. Тенант выбирает формат.',
      },
      {
        title: 'Автосопоставление',
        body: 'Сопоставление по назначению платежа, контрагенту, номеру счёта. Оценка уверенности.',
      },
      {
        title: 'Пакетное проведение',
        body: 'Проверьте сопоставления, проведите все подтверждённые оплаты разом. Источник выписки хранится в журнале.',
      },
      {
        title: 'Закрытие взаиморасчётов',
        body: 'Регистры дебиторки и кредиторки обновляются в одной транзакции. Отчёты — мгновенно.',
      },
    ],
    cta: 'Включить банк',
  },
};

const TR: Record<FeatureSlug, FeatureDetail> = {
  'sales-invoicing': {
    slug: 'sales-invoicing',
    iconKey: 'receipt',
    eyebrow: 'Satış',
    title: "Gerçek posting'li satış faturası",
    body: 'Müşteri bakiyesi, A/R kaydı, kısmi tahsilat — 1C operatörlerinin beklediği çift taraflı kayıt mantığı, modern arayüzle.',
    highlights: [
      {
        title: 'İskonto ve KDV ile fatura',
        body: 'Satır iskonto, KDV dahil/hariç, 1C tarzı fiyat tipleri ile müşteri bazlı override.',
      },
      {
        title: 'Kısmi tahsilatlı A/R kaydı',
        body: 'Her fatura accounts_receivable kaydına yazılır. Belge bazlı veya bakiye tahsilat. Yaşlandırma tek sorgu.',
      },
      {
        title: 'PDF ve e-posta ile gönderim',
        body: 'Kiracı-bazlı markalı PDF tek tıkla. Resend ile e-posta gönderimi yerleşik.',
      },
      {
        title: 'Çoklu para birimi',
        body: 'Kiracı baz para birimi, ISO-4217, dönemsel FX kurları. Raporlar doğru rolluyor.',
      },
    ],
    cta: 'Ücretsiz başla',
  },
  inventory: {
    slug: 'inventory',
    iconKey: 'warehouse',
    eyebrow: 'Stok',
    title: 'Çoklu depo envanteri',
    body: 'Depo bazlı gerçek zamanlı stok, transferler, düşük stok uyarısı, CSV ile açılış bakiyesi.',
    highlights: [
      {
        title: 'Gerçek zamanlı stok',
        body: 'Her post edilmiş belge birikim kaydını hareket ettirir. Depo stoğu tek okuma.',
      },
      {
        title: 'Transfer ve düzeltme',
        body: 'Depolar arası transferler audit ile. Sayım sonrası tek belge ile düzeltme.',
      },
      {
        title: 'CSV içe aktarım',
        body: 'İlk gün tablo yükleyin. Doğrulama, satır hatasında kısmi geri alma.',
      },
      {
        title: 'Düşük stok uyarısı',
        body: 'Ürün başına eşik. Stok asgariye düştüğünde e-posta/Telegram.',
      },
    ],
    cta: 'Ücretsiz başla',
  },
  'pricing-types': {
    slug: 'pricing-types',
    iconKey: 'tags',
    eyebrow: 'Fiyat',
    title: '1C tarzı fiyat tipleri',
    body: 'Statik ve dinamik fiyat tipleri, kâr marjı formülleri, müşteri bazlı override, dönem-doğru çözüm.',
    highlights: [
      {
        title: 'Statik ve dinamik',
        body: 'Statik = saklanan fiyatlar. Dinamik = formül (örn baz + %20 kâr marjı).',
      },
      {
        title: 'Dönemsel çözüm',
        body: 'Fiyat değişimleri tarihli. Herhangi bir tarih için çözüm — eski faturalar doğru kalır.',
      },
      {
        title: 'Müşteri override',
        body: 'Toptancı müşteriyi toptan fiyat tipine bağlayın. Partneri sözleşme fiyatına. Müşteri veya segment bazlı.',
      },
      {
        title: 'Fiyat matrisi',
        body: 'Ürün × fiyat-tipi matrisi. Kategoriye göre filtre. CSV export.',
      },
    ],
    cta: 'Ücretsiz başla',
  },
  'document-posting': {
    slug: 'document-posting',
    iconKey: 'file-check-2',
    eyebrow: 'Posting',
    title: 'Posting ve dönem kapanışı',
    body: 'İdempotent posting, dönem kilidi, her mutasyona audit. Güvenli geri alma.',
    highlights: [
      {
        title: 'İdempotent posting',
        body: 'Aynı belgeyi yeniden post = no-op. Posting sırasında çöker, çift sayım olmaz.',
      },
      {
        title: 'Dönem kapanışı',
        body: 'Bir dönemi (örn nisan) kilitleyin — kimse o tarihten önceki belgeleri post edemez veya değiştiremez.',
      },
      {
        title: 'Her mutasyonda audit',
        body: 'Her değişiklik tenant_id, user_id, before/after kaydeder. Kullanıcı/belge/tarih ile arama.',
      },
      {
        title: 'Güvenli geri alma',
        body: 'Belgeyi unpost edin — kayıt satırları silinir, negatif satır oluşmaz.',
      },
    ],
    cta: 'Ücretsiz başla',
  },
  'ai-ocr': {
    slug: 'ai-ocr',
    iconKey: 'scan-text',
    eyebrow: 'AI',
    title: 'AI fatura OCR',
    body: 'Tedarikçi faturasının fotoğrafını çekin. AI tedarikçi, satır, toplam, KDV çıkarır. Üç tıkta gözden geçirip post edin. Premium eklenti.',
    highlights: [
      {
        title: 'Fotoğraf veya PDF',
        body: 'Kamera, galeri veya PDF yükleme. Çok sayfalı fatura.',
      },
      {
        title: 'Satır, toplam, KDV',
        body: 'Satır başına ürün kodu, açıklama, miktar, birim fiyat, KDV oranı. Kod/barkod ile otomatik eşleştirme.',
      },
      {
        title: 'Post öncesi inceleme',
        body: 'Her alan için AI güven puanı. Güvenmediğinizi düzeltin.',
      },
      {
        title: 'Belge başına audit',
        body: 'OCR kaynak görüntüsü post edilmiş belgeyle birlikte saklanır.',
      },
    ],
    cta: "OCR'yi aç",
  },
  'bank-import': {
    slug: 'bank-import',
    iconKey: 'landmark',
    eyebrow: 'Banka',
    title: 'Banka ekstresi içe aktarımı',
    body: 'Sber, Tinkoff, Kaspi, 1C-Bank. Günlük ekstre içe aktarın. Açık fatura ve müşterilerle otomatik eşleştirin.',
    highlights: [
      {
        title: 'Çoklu banka parser',
        body: 'Sber 1C, Tinkoff Business, Kaspi, 1C-Bank XML, jenerik CSV. Kiracı format seçer.',
      },
      {
        title: 'Otomatik eşleştirme',
        body: 'Açıklama, müşteri adı, fatura numarası ile eşleştirme. Güven skoru.',
      },
      {
        title: 'Toplu post',
        body: 'Eşleşmeleri inceleyin, onaylananları toptan post edin. Kaynak ekstre audit altında.',
      },
      {
        title: 'A/R + A/P kapanışı',
        body: 'Alacak ve borç kayıtları tek transaksiyonda güncellenir. Raporlar anında.',
      },
    ],
    cta: 'Banka eklentisini aç',
  },
};

const TABLES: Record<'en' | 'ru' | 'tr', Record<FeatureSlug, FeatureDetail>> = {
  en: EN,
  ru: RU,
  tr: TR,
};

export const FEATURE_SLUGS: FeatureSlug[] = [
  'sales-invoicing',
  'inventory',
  'pricing-types',
  'document-posting',
  'ai-ocr',
  'bank-import',
];

export function getFeatureDetail(slug: string, locale: string): FeatureDetail | null {
  if (!(FEATURE_SLUGS as string[]).includes(slug)) return null;
  const lang: 'en' | 'ru' | 'tr' =
    locale === 'ru' || locale === 'tr' ? (locale as 'ru' | 'tr') : 'en';
  return TABLES[lang][slug as FeatureSlug];
}

export function listFeatures(locale: string): FeatureDetail[] {
  const lang: 'en' | 'ru' | 'tr' =
    locale === 'ru' || locale === 'tr' ? (locale as 'ru' | 'tr') : 'en';
  return FEATURE_SLUGS.map((s) => TABLES[lang][s]);
}
