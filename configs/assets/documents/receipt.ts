import { defineDocument, field } from '@/platform/metadata';

/**
 * `assets.receipt` — Поступление ОС / Asset Receipt.
 *
 * Capitalize an asset: records the acquisition event for a fixed asset
 * already present in the `assets.fixed_asset` catalog. Single-header, no
 * lines. The acquisition cost is recorded in the tenant's operational
 * currency.
 *
 * Posting is intentionally empty in this foundation phase — register
 * movements (capitalized cost, downstream depreciation accruals) are
 * deferred until the depreciation engine lands.
 */
defineDocument({
  module: 'assets',
  name: 'receipt',
  label: { en: 'Asset Receipt', ru: 'Поступление ОС', tr: 'Sabit Kıymet Alımı' },
  pluralLabel: {
    en: 'Asset Receipts',
    ru: 'Поступления ОС',
    tr: 'Sabit Kıymet Alımları',
  },
  icon: 'PackagePlus',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    asset: field.reference({
      label: { en: 'Asset', ru: 'Основное средство', tr: 'Sabit Kıymet' },
      required: true,
      to: { kind: 'ref', module: 'assets', name: 'fixed_asset' },
    }),
    supplier: field.reference({
      label: { en: 'Supplier', ru: 'Поставщик', tr: 'Tedarikçi' },
      to: { kind: 'ref', module: 'purchases', name: 'supplier' },
    }),
    amount: field.money({
      label: {
        en: 'Acquisition Amount',
        ru: 'Сумма приобретения',
        tr: 'Alış Tutarı',
      },
      required: true,
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
  lines: {},
  posting: {},
  permissions: { read: 'any' },
  displayField: 'asset',
});
