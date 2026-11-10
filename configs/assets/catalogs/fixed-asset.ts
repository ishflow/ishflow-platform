import { defineCatalog, field } from '@/platform/metadata';

/**
 * `assets.fixed_asset` — Основные средства / Fixed Asset.
 *
 * Physical asset register: capitalized equipment, vehicles, furniture, etc.
 * Status transitions (`registered` → `in_use` → `disposed`) are driven by
 * the matching assets documents (receipt / commissioning / disposal) — the
 * engine itself does not enforce the transition graph yet.
 *
 * Depreciation is NOT computed here; the `depreciationMethod` + `usefulLifeMonths`
 * fields exist so a future depreciation engine can read the schedule without
 * a follow-up migration.
 */
defineCatalog({
  module: 'assets',
  name: 'fixed_asset',
  label: { en: 'Fixed Asset', ru: 'Основное средство', tr: 'Sabit Kıymet' },
  pluralLabel: {
    en: 'Fixed Assets',
    ru: 'Основные средства',
    tr: 'Sabit Kıymetler',
  },
  icon: 'Server',
  fields: {
    code: field.string({
      label: { en: 'Code', ru: 'Код', tr: 'Kod' },
      required: true,
      maxLength: 32,
      formHidden: true,
      listHidden: true,
      autoGenerate: 'sequence',
    }),
    name: field.string({
      label: { en: 'Name', ru: 'Наименование', tr: 'Ad' },
      required: true,
      maxLength: 256,
    }),
    inventoryNumber: field.string({
      label: { en: 'Inventory №', ru: 'Инв. №', tr: 'Demirbaş №' },
      maxLength: 64,
    }),
    category: field.string({
      label: { en: 'Category', ru: 'Категория', tr: 'Kategori' },
      maxLength: 64,
    }),
    manufacturer: field.string({
      label: { en: 'Manufacturer', ru: 'Производитель', tr: 'Üretici' },
      maxLength: 128,
    }),
    serialNumber: field.string({
      label: { en: 'Serial №', ru: 'Серийный №', tr: 'Seri No' },
      maxLength: 128,
    }),
    acquisitionDate: field.date({
      label: { en: 'Acquired On', ru: 'Дата покупки', tr: 'Edinme Tarihi' },
    }),
    acquisitionCost: field.money({
      label: {
        en: 'Acquisition Cost',
        ru: 'Первоначальная стоимость',
        tr: 'İlk Maliyet',
      },
    }),
    usefulLifeMonths: field.number({
      label: {
        en: 'Useful Life (months)',
        ru: 'СПИ (мес.)',
        tr: 'Faydalı Ömür (ay)',
      },
      min: 0,
    }),
    depreciationMethod: field.string({
      label: {
        en: 'Depreciation Method',
        ru: 'Метод амортизации',
        tr: 'Amortisman Yöntemi',
      },
      maxLength: 32,
      enumValues: ['linear', 'declining', 'units'],
      enumLabels: {
        linear: { en: 'Linear (straight-line)', ru: 'Линейный', tr: 'Doğrusal' },
        declining: {
          en: 'Declining balance',
          ru: 'Уменьшающийся остаток',
          tr: 'Azalan bakiye',
        },
        units: {
          en: 'Units of production',
          ru: 'По объёму производства',
          tr: 'Üretim birimi',
        },
      },
    }),
    status: field.string({
      label: { en: 'Status', ru: 'Статус', tr: 'Durum' },
      maxLength: 32,
      enumValues: ['registered', 'in_use', 'disposed'],
      enumLabels: {
        registered: { en: 'Registered', ru: 'Зарегистрировано', tr: 'Kayıtlı' },
        in_use: { en: 'In Use', ru: 'Эксплуатация', tr: 'Kullanımda' },
        disposed: { en: 'Disposed', ru: 'Списано', tr: 'Silinmiş' },
      },
    }),
    location: field.string({
      label: { en: 'Location', ru: 'Местонахождение', tr: 'Lokasyon' },
      maxLength: 128,
    }),
    responsibleId: field.string({
      label: { en: 'Responsible', ru: 'МОЛ', tr: 'Sorumlu' },
      maxLength: 128,
    }),
    notes: field.text({
      label: { en: 'Notes', ru: 'Примечание', tr: 'Açıklama' },
    }),
  },
  displayField: 'name',
  list: {
    layout: 'table',
    searchable: true,
    columns: [
      { key: 'name', label: { en: 'Name', ru: 'Наименование', tr: 'Ad' } },
      { key: 'inventoryNumber', label: { en: 'Inventory №', ru: 'Инв. №', tr: 'Demirbaş №' } },
      { key: 'category', label: { en: 'Category', ru: 'Категория', tr: 'Kategori' } },
      { key: 'status', label: { en: 'Status', ru: 'Статус', tr: 'Durum' } },
      {
        key: 'acquisitionCost',
        label: { en: 'Acquisition Cost', ru: 'Первоначальная стоимость', tr: 'İlk Maliyet' },
      },
    ],
  },
  permissions: { read: 'any' },
});
