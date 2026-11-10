/**
 * Localized addon catalog labels — single source of truth for addon titles
 * and short descriptions, shared by the super-admin console (operator UI) and
 * the tenant-facing app (sidebar + addon home pages).
 *
 * EN / RU / TR carry hand-written copy. Other locales fall back to EN until
 * native translations land.
 */

import type { AddonKey } from './catalog';

export type AddonLocale = 'en' | 'ru' | 'tr';

export interface AddonLabels {
  readonly title: string;
  readonly description: string;
}

const EN: Record<AddonKey, AddonLabels> = {
  ai_invoice_ocr: {
    title: 'AI Invoice OCR',
    description: 'Photograph a supplier invoice and let AI fill in the purchase invoice for you.',
  },
  bank_integration: {
    title: 'Bank import & auto-match',
    description:
      'Import bank statements (Sber, Tinkoff, Kaspi, 1C-Bank) and auto-match transactions to open invoices.',
  },
  kkt_54fz: {
    title: '54-FZ online cash register',
    description:
      'Russian Federal Law №54 receipt fiscalization through ОФД, with shift open/close.',
  },
  marking_chestny_znak: {
    title: 'Marking (Chestny Znak)',
    description:
      'DataMatrix scanning + Chestny Znak portal integration for marked goods (tobacco, shoes, dairy, …).',
  },
  edo_integration: {
    title: 'Electronic document exchange (EDO)',
    description: 'Diadoc, SBIS, and Kontur.Diadok connectors for B2B electronic invoice exchange.',
  },
  esf_kazakhstan: {
    title: 'ESF Kazakhstan',
    description:
      'Direct e-invoice submission to the Kazakhstan IS ESF portal — required for B2B in KZ.',
  },
  telegram_bot: {
    title: 'Telegram notifications bot',
    description:
      'Order notifications, daily revenue reports, manager approvals — straight to Telegram.',
  },
  barcode_label_printer: {
    title: 'Barcode scanner & label printer',
    description:
      'Zebra/Honeywell scanners + TSC/Godex thermal printers for product, shelf, and marking labels.',
  },
  marketplace_sync: {
    title: 'Marketplace live sync',
    description:
      'Wildberries, Ozon and Kaspi: pull orders, push stock, handle returns — beyond recipe templates.',
  },
  multi_company: {
    title: 'Multi-company',
    description:
      'Manage 2+ legal entities (УСН + ОСН) from a single workspace with consolidated reporting.',
  },
  b2b_portal: {
    title: 'B2B customer portal',
    description:
      'Wholesale customers log in to place orders, see balance, and download reconciliation statements.',
  },
  ai_query: {
    title: 'AI query',
    description:
      'Ask "how much did I sell last week?" — natural-language answers grounded in your data.',
  },
  oneC_migration: {
    title: '1C migration',
    description:
      'Import products, customers and suppliers from a 1C EnterpriseData XML export — preview, map, and run.',
  },
};

const RU: Record<AddonKey, AddonLabels> = {
  ai_invoice_ocr: {
    title: 'ИИ-распознавание счетов',
    description: 'Сфотографируйте счёт поставщика — ИИ автоматически заполнит приходную накладную.',
  },
  bank_integration: {
    title: 'Банк-клиент: импорт и сверка',
    description:
      'Импорт выписок (Сбер, Тинькофф, Kaspi, 1С-Банк) и автоподбор платежей к открытым счетам.',
  },
  kkt_54fz: {
    title: 'Онлайн-касса 54-ФЗ',
    description: 'Фискализация чеков через ОФД по 54-ФЗ, открытие/закрытие смены, X- и Z-отчёты.',
  },
  marking_chestny_znak: {
    title: 'Маркировка («Честный знак»)',
    description:
      'Сканирование DataMatrix + интеграция с порталом ЧЗ для табака, обуви, молочной продукции и др.',
  },
  edo_integration: {
    title: 'ЭДО (Диадок / СБИС / Контур)',
    description: 'Коннекторы Диадок, СБИС и Контур.Диадок для электронного документооборота B2B.',
  },
  esf_kazakhstan: {
    title: 'ЭСФ (Казахстан)',
    description:
      'Отправка электронных счетов-фактур напрямую в ИС ЭСФ Казахстана — обязательно для B2B.',
  },
  telegram_bot: {
    title: 'Telegram-бот уведомлений',
    description:
      'Уведомления о заказах, дневные отчёты по выручке, согласования менеджеров — в Telegram.',
  },
  barcode_label_printer: {
    title: 'Сканер штрих-кодов и печать этикеток',
    description:
      'Сканеры Zebra/Honeywell и термопринтеры TSC/Godex: товарные, полочные и марочные этикетки.',
  },
  marketplace_sync: {
    title: 'Wildberries / Ozon / Kaspi sync',
    description:
      'Получение заказов, выгрузка остатков, обработка возвратов — реальная синхронизация, не рецепты.',
  },
  multi_company: {
    title: 'Несколько юр. лиц',
    description:
      'Управление двумя и более юр. лицами (УСН + ОСН) из одного рабочего пространства, сводная отчётность.',
  },
  b2b_portal: {
    title: 'B2B-портал для оптовиков',
    description:
      'Оптовые покупатели заходят в личный кабинет: заказы, баланс, акты сверки — без звонков менеджеру.',
  },
  ai_query: {
    title: 'ИИ-запрос к данным',
    description:
      'Спросите «сколько я продал на прошлой неделе?» — естественные ответы по вашим данным.',
  },
  oneC_migration: {
    title: 'Миграция из 1С',
    description:
      'Импорт номенклатуры, клиентов и поставщиков из выгрузки 1С (EnterpriseData XML): предпросмотр, сопоставление, импорт.',
  },
};

const TR: Record<AddonKey, AddonLabels> = {
  ai_invoice_ocr: {
    title: 'AI Fatura OCR',
    description:
      'Tedarikçi faturasının fotoğrafını çekin; yapay zekâ alım faturasını sizin için doldursun.',
  },
  bank_integration: {
    title: 'Banka ekstresi import + auto-match',
    description:
      'Sber, Tinkoff, Kaspi, 1С-Bank ekstrelerini içe aktarın; işlemleri açık faturalara otomatik eşleyin.',
  },
  kkt_54fz: {
    title: '54-FZ Online Kasa',
    description:
      'Rusya 54-FZ kapsamında ÖFD üzerinden fiş fiskalizasyonu, vardiya aç/kapa, X/Z raporları.',
  },
  marking_chestny_znak: {
    title: 'Markalama (Chestny Znak)',
    description:
      'DataMatrix tarama + ChestnyZnak portal entegrasyonu: tütün, ayakkabı, süt ürünleri ve diğerleri.',
  },
  edo_integration: {
    title: 'EDO (Diadoc / SBIS / Kontur)',
    description:
      'B2B elektronik fatura alışverişi için Diadoc, SBIS ve Kontur.Diadok bağlayıcıları.',
  },
  esf_kazakhstan: {
    title: 'ESF Kazakistan',
    description: 'Kazakistan IS ESF portalına doğrudan e-fatura gönderimi — KZ B2B için zorunlu.',
  },
  telegram_bot: {
    title: 'Telegram bildirim botu',
    description: 'Sipariş bildirimi, günlük ciro raporu, yönetici onayları — doğrudan Telegram’a.',
  },
  barcode_label_printer: {
    title: 'Barkod tarayıcı + etiket yazıcı',
    description:
      'Zebra/Honeywell tarayıcılar ve TSC/Godex termal yazıcılar: ürün, raf ve markalama etiketleri.',
  },
  marketplace_sync: {
    title: 'Marketplace canlı sync',
    description:
      'Wildberries, Ozon, Kaspi: sipariş çekme, stok push, iade workflow — tarif değil gerçek sync.',
  },
  multi_company: {
    title: 'Çoklu şirket',
    description: '2+ hukuki kişiliği (УСН + ОСН) tek workspace’ten yönet, konsolide raporlama.',
  },
  b2b_portal: {
    title: 'B2B müşteri portalı',
    description:
      'Toptan müşteriler login olur: sipariş, bakiye, mutabakat aktı indirme — telefon trafiği biter.',
  },
  ai_query: {
    title: 'AI doğal-dil sorgu',
    description: '"Geçen hafta ne kadar sattım?" — verilerin üzerinden doğal-dil cevaplar.',
  },
  oneC_migration: {
    title: '1C geçişi',
    description:
      '1C EnterpriseData XML çıktısından ürün, müşteri ve tedarikçi içe aktarımı — önizle, eşle, çalıştır.',
  },
};

const BY_LOCALE: Record<AddonLocale, Record<AddonKey, AddonLabels>> = {
  en: EN,
  ru: RU,
  tr: TR,
};

export function getAddonLabels(key: AddonKey, locale: string): AddonLabels {
  const short = String(locale).slice(0, 2).toLowerCase();
  const dict = (BY_LOCALE as Record<string, Record<AddonKey, AddonLabels>>)[short] ?? EN;
  return dict[key];
}
