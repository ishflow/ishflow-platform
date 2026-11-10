/**
 * Local i18n dictionary for the SA tenant deep-ops pages
 * (timeline / vitals / tags / notes / overrides / overview action bar).
 *
 * Mirrors the pattern of `platform/super-admin/dict.ts` but lives next to
 * the feature so it can ship without touching the shared dict file. EN
 * + RU + TR are hand-written; other locales fall back to EN.
 */

import { getSuperAdminLocale } from '@/platform/super-admin/i18n-server';

interface TabsLocale {
  timeline: string;
  vitals: string;
  tags: string;
  notes: string;
  overrides: string;
}

interface ActionBarLocale {
  title: string;
  suspend: string;
  liftSuspension: string;
  archive: string;
  restore: string;
  hardDelete: string;
  transfer: string;
  wipe: string;
  exportJson: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  slugLabel: string;
  slugDescription: string;
  newOwnerLabel: string;
  newOwnerPlaceholder: string;
  confirm: string;
  cancel: string;
  suspendTitle: string;
  suspendDescription: string;
  liftTitle: string;
  liftDescription: string;
  archiveTitle: string;
  archiveDescription: string;
  restoreTitle: string;
  restoreDescription: string;
  hardDeleteTitle: string;
  hardDeleteDescription: string;
  transferTitle: string;
  transferDescription: string;
  wipeTitle: string;
  wipeDescription: string;
  suspendedBadge: string;
  archivedBadge: string;
  suspendedSince: string;
  archivedSince: string;
}

interface TimelineLocale {
  title: string;
  description: string;
  empty: string;
  kinds: {
    billing: string;
    platform_audit: string;
    addon_toggle: string;
    suspension: string;
    status_change: string;
  };
  columns: {
    when: string;
    kind: string;
    label: string;
    actor: string;
    detail: string;
  };
}

interface VitalsLocale {
  title: string;
  description: string;
  windowLabel: string;
  windows: {
    '30': string;
    '90': string;
    '365': string;
  };
  cards: {
    docs: { label: string; hint: string };
    users: { label: string; hint: string };
    ar: { label: string; hint: string };
    errors: { label: string; hint: string };
  };
  chart: {
    title: string;
    empty: string;
    xLabel: string;
    yLabel: string;
  };
  topCustomers: {
    title: string;
    empty: string;
    columns: { name: string; total: string };
  };
  topProducts: {
    title: string;
    empty: string;
    columns: { name: string; total: string };
  };
}

interface TagsLocale {
  title: string;
  description: string;
  empty: string;
  addTitle: string;
  labelLabel: string;
  labelPlaceholder: string;
  colorLabel: string;
  addButton: string;
  removeButton: string;
}

interface NotesLocale {
  title: string;
  description: string;
  empty: string;
  newTitle: string;
  newPlaceholder: string;
  addButton: string;
  authorPrefix: string;
  removeButton: string;
}

interface OverridesLocale {
  title: string;
  description: string;
  planLimitsTitle: string;
  planLimitsDescription: string;
  priceOverride: {
    title: string;
    description: string;
    empty: string;
    monthlyLabel: string;
    monthlyPlaceholder: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    expiresLabel: string;
    saveButton: string;
    removeButton: string;
    currentLine: string;
  };
  featureKill: {
    title: string;
    description: string;
    empty: string;
    keyLabel: string;
    keyPlaceholder: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    addButton: string;
    removeButton: string;
    columns: { key: string; reason: string; killedAt: string };
  };
}

export interface TenantProDict {
  tabs: TabsLocale;
  actionBar: ActionBarLocale;
  timeline: TimelineLocale;
  vitals: VitalsLocale;
  tags: TagsLocale;
  notes: NotesLocale;
  overrides: OverridesLocale;
}

const en: TenantProDict = {
  tabs: {
    timeline: 'Timeline',
    vitals: 'Vitals',
    tags: 'Tags',
    notes: 'Notes',
    overrides: 'Overrides',
  },
  actionBar: {
    title: 'Operator actions',
    suspend: 'Suspend',
    liftSuspension: 'Lift suspension',
    archive: 'Archive',
    restore: 'Restore',
    hardDelete: 'Hard delete',
    transfer: 'Transfer ownership',
    wipe: 'Wipe transactional data',
    exportJson: 'Export JSON',
    reasonLabel: 'Reason',
    reasonPlaceholder: 'e.g. unpaid past_due > 30 days',
    slugLabel: 'Type the tenant slug to confirm',
    slugDescription: 'This step is irreversible.',
    newOwnerLabel: 'New owner (user UUID)',
    newOwnerPlaceholder: 'uuid…',
    confirm: 'Confirm',
    cancel: 'Cancel',
    suspendTitle: 'Suspend tenant?',
    suspendDescription:
      'Users will be redirected to /suspended. Operator actions remain available.',
    liftTitle: 'Lift suspension?',
    liftDescription: 'Tenant status returns to active immediately.',
    archiveTitle: 'Archive tenant?',
    archiveDescription:
      'Tenant becomes invisible to active lists. Data is kept for 30 days; restore is possible during that window.',
    restoreTitle: 'Restore tenant?',
    restoreDescription: 'Clears deletedAt and brings the tenant back online.',
    hardDeleteTitle: 'Permanently delete tenant?',
    hardDeleteDescription:
      'All data (memberships, documents, audit) is removed via FK cascade. Requires 30 days archived OR explicit slug match.',
    transferTitle: 'Transfer ownership?',
    transferDescription:
      'The current owner loses the `owner` role; the new user must already be a member.',
    wipeTitle: 'Wipe transactional data?',
    wipeDescription:
      'Deletes every document, line, and register movement row for this tenant. Catalogs, memberships, and settings remain intact.',
    suspendedBadge: 'Suspended',
    archivedBadge: 'Archived',
    suspendedSince: 'Suspended since {date}',
    archivedSince: 'Archived since {date}',
  },
  timeline: {
    title: 'Timeline',
    description:
      'Chronological feed combining billing events, operator actions, addon toggles, and suspension changes.',
    empty: 'No events recorded yet.',
    kinds: {
      billing: 'Billing',
      platform_audit: 'Operator',
      addon_toggle: 'Add-on',
      suspension: 'Suspension',
      status_change: 'Status',
    },
    columns: {
      when: 'When',
      kind: 'Kind',
      label: 'Event',
      actor: 'Actor',
      detail: 'Detail',
    },
  },
  vitals: {
    title: 'Vitals',
    description: 'Live operational vitals for this tenant.',
    windowLabel: 'Window',
    windows: { '30': 'Last 30 days', '90': 'Last 90 days', '365': 'Last 365 days' },
    cards: {
      docs: { label: 'Documents', hint: 'Total in window' },
      users: { label: 'Users', hint: 'Memberships' },
      ar: { label: 'A/R outstanding', hint: 'From accounts_receivable register' },
      errors: { label: 'Errors', hint: 'Audit actions ending in .failed' },
    },
    chart: {
      title: 'Documents per day',
      empty: 'No documents in this window.',
      xLabel: 'Date',
      yLabel: 'Docs',
    },
    topCustomers: {
      title: 'Top 5 customers',
      empty: 'No customer sales in this window.',
      columns: { name: 'Customer', total: 'Total' },
    },
    topProducts: {
      title: 'Top 5 products',
      empty: 'No product sales in this window.',
      columns: { name: 'Product', total: 'Total' },
    },
  },
  tags: {
    title: 'Tags',
    description: 'Operator-only labels for filtering and triage.',
    empty: 'No tags yet.',
    addTitle: 'Add tag',
    labelLabel: 'Label',
    labelPlaceholder: 'e.g. vip · paying-customer',
    colorLabel: 'Color',
    addButton: 'Add',
    removeButton: 'Remove',
  },
  notes: {
    title: 'Notes',
    description: 'Operator-only Markdown notes. Each save writes an audit row.',
    empty: 'No notes yet.',
    newTitle: 'New note',
    newPlaceholder: 'Markdown is supported…',
    addButton: 'Save note',
    authorPrefix: 'by',
    removeButton: 'Remove',
  },
  overrides: {
    title: 'Overrides',
    description: 'Per-tenant adjustments applied on top of the published plan matrix.',
    planLimitsTitle: 'Plan limit overrides',
    planLimitsDescription: 'Edit individual limits (maxUsers, maxInvoicesPerMonth, …).',
    priceOverride: {
      title: 'Custom monthly price',
      description: 'Override the plan price for this tenant only.',
      empty: 'No custom price — tenant pays the published plan rate.',
      monthlyLabel: 'Monthly price (USD)',
      monthlyPlaceholder: '49',
      reasonLabel: 'Reason',
      reasonPlaceholder: 'e.g. annual prepay discount',
      expiresLabel: 'Effective until (optional)',
      saveButton: 'Save override',
      removeButton: 'Remove override',
      currentLine: 'Current: ${amount}/mo',
    },
    featureKill: {
      title: 'Feature kill-switches',
      description: 'Disable specific features for this tenant at the platform level.',
      empty: 'No feature kill-switches.',
      keyLabel: 'Feature key',
      keyPlaceholder: 'e.g. ocr.purchaseInvoice',
      reasonLabel: 'Reason (optional)',
      reasonPlaceholder: 'e.g. abused free quota',
      addButton: 'Kill feature',
      removeButton: 'Restore',
      columns: { key: 'Feature', reason: 'Reason', killedAt: 'Since' },
    },
  },
};

const ru: TenantProDict = {
  tabs: {
    timeline: 'Хронология',
    vitals: 'Показатели',
    tags: 'Метки',
    notes: 'Заметки',
    overrides: 'Переопределения',
  },
  actionBar: {
    title: 'Действия оператора',
    suspend: 'Приостановить',
    liftSuspension: 'Снять блокировку',
    archive: 'Архивировать',
    restore: 'Восстановить',
    hardDelete: 'Удалить навсегда',
    transfer: 'Передать владение',
    wipe: 'Очистить транзакционные данные',
    exportJson: 'Экспорт JSON',
    reasonLabel: 'Причина',
    reasonPlaceholder: 'напр. неоплата past_due > 30 дней',
    slugLabel: 'Введите slug клиента, чтобы подтвердить',
    slugDescription: 'Действие необратимо.',
    newOwnerLabel: 'Новый владелец (UUID пользователя)',
    newOwnerPlaceholder: 'uuid…',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
    suspendTitle: 'Приостановить клиента?',
    suspendDescription:
      'Пользователи будут перенаправлены на /suspended. Действия оператора остаются доступны.',
    liftTitle: 'Снять блокировку?',
    liftDescription: 'Статус клиента сразу вернётся к active.',
    archiveTitle: 'Архивировать клиента?',
    archiveDescription:
      'Клиент исчезает из активных списков. Данные хранятся 30 дней, восстановление возможно в этом окне.',
    restoreTitle: 'Восстановить клиента?',
    restoreDescription: 'Очищает deletedAt и возвращает клиента в строй.',
    hardDeleteTitle: 'Удалить клиента навсегда?',
    hardDeleteDescription:
      'Все данные (участники, документы, журнал) удаляются каскадом FK. Требуется архив > 30 дней ИЛИ явный slug.',
    transferTitle: 'Передать владение?',
    transferDescription:
      'Текущий владелец теряет роль owner; новый пользователь уже должен быть участником.',
    wipeTitle: 'Очистить транзакционные данные?',
    wipeDescription:
      'Удаляются все документы, строки и движения регистров клиента. Каталоги, участники и настройки сохраняются.',
    suspendedBadge: 'Приостановлен',
    archivedBadge: 'Архивирован',
    suspendedSince: 'Приостановлен с {date}',
    archivedSince: 'Архивирован с {date}',
  },
  timeline: {
    title: 'Хронология',
    description:
      'Хронологическая лента: события биллинга, действия оператора, переключения аддонов, блокировки.',
    empty: 'События пока не зафиксированы.',
    kinds: {
      billing: 'Биллинг',
      platform_audit: 'Оператор',
      addon_toggle: 'Аддон',
      suspension: 'Блокировка',
      status_change: 'Статус',
    },
    columns: {
      when: 'Когда',
      kind: 'Тип',
      label: 'Событие',
      actor: 'Кем',
      detail: 'Детали',
    },
  },
  vitals: {
    title: 'Показатели',
    description: 'Оперативные показатели клиента в реальном времени.',
    windowLabel: 'Период',
    windows: { '30': 'Последние 30 дней', '90': 'Последние 90 дней', '365': 'Последние 365 дней' },
    cards: {
      docs: { label: 'Документы', hint: 'Итого за период' },
      users: { label: 'Пользователи', hint: 'Участники' },
      ar: { label: 'Дебиторка', hint: 'Из регистра accounts_receivable' },
      errors: { label: 'Ошибки', hint: 'Действия аудита с суффиксом .failed' },
    },
    chart: {
      title: 'Документы по дням',
      empty: 'В этом периоде документов нет.',
      xLabel: 'Дата',
      yLabel: 'Документы',
    },
    topCustomers: {
      title: 'Топ-5 клиентов',
      empty: 'Продаж клиентам нет.',
      columns: { name: 'Клиент', total: 'Сумма' },
    },
    topProducts: {
      title: 'Топ-5 товаров',
      empty: 'Продаж товаров нет.',
      columns: { name: 'Товар', total: 'Сумма' },
    },
  },
  tags: {
    title: 'Метки',
    description: 'Метки оператора для фильтрации и триажа.',
    empty: 'Меток пока нет.',
    addTitle: 'Добавить метку',
    labelLabel: 'Текст',
    labelPlaceholder: 'напр. vip · платный',
    colorLabel: 'Цвет',
    addButton: 'Добавить',
    removeButton: 'Удалить',
  },
  notes: {
    title: 'Заметки',
    description: 'Markdown-заметки оператора. Каждое сохранение пишет запись в аудит.',
    empty: 'Заметок пока нет.',
    newTitle: 'Новая заметка',
    newPlaceholder: 'Поддерживается Markdown…',
    addButton: 'Сохранить заметку',
    authorPrefix: 'автор',
    removeButton: 'Удалить',
  },
  overrides: {
    title: 'Переопределения',
    description: 'Корректировки поверх опубликованной матрицы тарифов для этого клиента.',
    planLimitsTitle: 'Переопределения лимитов',
    planLimitsDescription: 'Точечные изменения лимитов (maxUsers, maxInvoicesPerMonth, …).',
    priceOverride: {
      title: 'Своя ежемесячная цена',
      description: 'Переопределить цену тарифа только для этого клиента.',
      empty: 'Цены нет — клиент платит по тарифу.',
      monthlyLabel: 'Ежемесячная цена (USD)',
      monthlyPlaceholder: '49',
      reasonLabel: 'Причина',
      reasonPlaceholder: 'напр. скидка за предоплату на год',
      expiresLabel: 'Действует до (опционально)',
      saveButton: 'Сохранить',
      removeButton: 'Удалить переопределение',
      currentLine: 'Сейчас: ${amount}/мес',
    },
    featureKill: {
      title: 'Отключения функций',
      description: 'Отключить отдельные функции для этого клиента на уровне платформы.',
      empty: 'Отключений нет.',
      keyLabel: 'Ключ функции',
      keyPlaceholder: 'напр. ocr.purchaseInvoice',
      reasonLabel: 'Причина (опционально)',
      reasonPlaceholder: 'напр. злоупотребление бесплатной квотой',
      addButton: 'Отключить',
      removeButton: 'Вернуть',
      columns: { key: 'Функция', reason: 'Причина', killedAt: 'Когда' },
    },
  },
};

const tr: TenantProDict = {
  tabs: {
    timeline: 'Zaman çizelgesi',
    vitals: 'Sağlık',
    tags: 'Etiketler',
    notes: 'Notlar',
    overrides: 'İstisnalar',
  },
  actionBar: {
    title: 'Operatör eylemleri',
    suspend: 'Askıya al',
    liftSuspension: 'Askıyı kaldır',
    archive: 'Arşivle',
    restore: 'Geri yükle',
    hardDelete: 'Kalıcı sil',
    transfer: 'Sahipliği devret',
    wipe: 'İşlem verilerini sil',
    exportJson: 'JSON dışa aktar',
    reasonLabel: 'Sebep',
    reasonPlaceholder: 'örn. ödenmemiş past_due > 30 gün',
    slugLabel: 'Onaylamak için kiracı slug yazın',
    slugDescription: 'Bu adım geri alınamaz.',
    newOwnerLabel: 'Yeni sahip (kullanıcı UUID)',
    newOwnerPlaceholder: 'uuid…',
    confirm: 'Onayla',
    cancel: 'İptal',
    suspendTitle: 'Kiracıyı askıya al?',
    suspendDescription:
      'Kullanıcılar /suspended sayfasına yönlendirilir. Operatör eylemleri çalışır kalır.',
    liftTitle: 'Askıyı kaldır?',
    liftDescription: 'Kiracı durumu anında active olur.',
    archiveTitle: 'Kiracıyı arşivle?',
    archiveDescription:
      'Kiracı aktif listelerden kaybolur. Veriler 30 gün tutulur; bu pencerede geri yüklenebilir.',
    restoreTitle: 'Kiracıyı geri yükle?',
    restoreDescription: 'deletedAt temizlenir ve kiracı tekrar çalışır.',
    hardDeleteTitle: 'Kiracıyı kalıcı sil?',
    hardDeleteDescription:
      'Tüm veriler (üyelikler, belgeler, denetim) FK kaskadı ile silinir. 30 gün arşiv VEYA açık slug eşleşmesi gerekir.',
    transferTitle: 'Sahipliği devret?',
    transferDescription: 'Mevcut sahip owner rolünü kaybeder; yeni kullanıcı zaten üye olmalıdır.',
    wipeTitle: 'İşlem verilerini sil?',
    wipeDescription:
      'Tüm belgeler, satırlar ve register hareketleri silinir. Kataloglar, üyelikler ve ayarlar korunur.',
    suspendedBadge: 'Askıda',
    archivedBadge: 'Arşivde',
    suspendedSince: '{date} tarihinden beri askıda',
    archivedSince: '{date} tarihinden beri arşivde',
  },
  timeline: {
    title: 'Zaman çizelgesi',
    description:
      'Faturalandırma olayları, operatör eylemleri, eklenti açma/kapama ve askıya alma anlarını birleştiren kronolojik akış.',
    empty: 'Henüz kayıt yok.',
    kinds: {
      billing: 'Faturalandırma',
      platform_audit: 'Operatör',
      addon_toggle: 'Eklenti',
      suspension: 'Askıya alma',
      status_change: 'Durum',
    },
    columns: {
      when: 'Ne zaman',
      kind: 'Tür',
      label: 'Olay',
      actor: 'Kim',
      detail: 'Detay',
    },
  },
  vitals: {
    title: 'Sağlık',
    description: 'Kiracıya ait canlı operasyonel göstergeler.',
    windowLabel: 'Pencere',
    windows: { '30': 'Son 30 gün', '90': 'Son 90 gün', '365': 'Son 365 gün' },
    cards: {
      docs: { label: 'Belgeler', hint: 'Pencere toplamı' },
      users: { label: 'Kullanıcılar', hint: 'Üyelikler' },
      ar: { label: 'Alacak bakiyesi', hint: 'accounts_receivable register' },
      errors: { label: 'Hatalar', hint: '.failed ile biten denetim eylemleri' },
    },
    chart: {
      title: 'Günlük belge sayısı',
      empty: 'Bu pencerede belge yok.',
      xLabel: 'Tarih',
      yLabel: 'Belge',
    },
    topCustomers: {
      title: 'En çok satılan 5 müşteri',
      empty: 'Bu pencerede müşteri satışı yok.',
      columns: { name: 'Müşteri', total: 'Toplam' },
    },
    topProducts: {
      title: 'En çok satılan 5 ürün',
      empty: 'Bu pencerede ürün satışı yok.',
      columns: { name: 'Ürün', total: 'Toplam' },
    },
  },
  tags: {
    title: 'Etiketler',
    description: 'Operatöre özel filtreleme/triyaj etiketleri.',
    empty: 'Etiket yok.',
    addTitle: 'Etiket ekle',
    labelLabel: 'Etiket',
    labelPlaceholder: 'örn. vip · ücretli',
    colorLabel: 'Renk',
    addButton: 'Ekle',
    removeButton: 'Kaldır',
  },
  notes: {
    title: 'Notlar',
    description: 'Operatöre özel Markdown notları. Her kayıt audit satırı yazar.',
    empty: 'Not yok.',
    newTitle: 'Yeni not',
    newPlaceholder: 'Markdown destekli…',
    addButton: 'Notu kaydet',
    authorPrefix: 'yazar',
    removeButton: 'Kaldır',
  },
  overrides: {
    title: 'İstisnalar',
    description: 'Yayınlanmış plan matrisinin üzerine kiracıya özel ayarlamalar.',
    planLimitsTitle: 'Plan limit istisnaları',
    planLimitsDescription: 'Limitleri ayrı ayrı düzenleyin (maxUsers, maxInvoicesPerMonth, …).',
    priceOverride: {
      title: 'Özel aylık fiyat',
      description: 'Yalnız bu kiracı için plan fiyatını değiştir.',
      empty: 'Özel fiyat yok — kiracı yayınlanmış plan ücretini öder.',
      monthlyLabel: 'Aylık fiyat (USD)',
      monthlyPlaceholder: '49',
      reasonLabel: 'Sebep',
      reasonPlaceholder: 'örn. yıllık ön ödeme indirimi',
      expiresLabel: 'Geçerlilik (opsiyonel)',
      saveButton: 'Kaydet',
      removeButton: 'İstisnayı kaldır',
      currentLine: 'Şu an: ${amount}/ay',
    },
    featureKill: {
      title: 'Özellik kapatma',
      description: 'Bu kiracıya özel bazı özellikleri platform seviyesinde kapat.',
      empty: 'Kapatılmış özellik yok.',
      keyLabel: 'Özellik anahtarı',
      keyPlaceholder: 'örn. ocr.purchaseInvoice',
      reasonLabel: 'Sebep (opsiyonel)',
      reasonPlaceholder: 'örn. ücretsiz kotanın suistimali',
      addButton: 'Kapat',
      removeButton: 'Geri aç',
      columns: { key: 'Özellik', reason: 'Sebep', killedAt: 'Tarih' },
    },
  },
};

export function getTenantProDictForLocale(locale: string): TenantProDict {
  switch (locale) {
    case 'ru':
      return ru;
    case 'tr':
      return tr;
    default:
      return en;
  }
}

export async function getTenantProDict(): Promise<TenantProDict> {
  const locale = await getSuperAdminLocale();
  return getTenantProDictForLocale(locale);
}
