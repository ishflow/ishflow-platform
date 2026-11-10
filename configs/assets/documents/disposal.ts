import { defineDocument, field } from '@/platform/metadata';

/**
 * `assets.disposal` — Списание ОС / Asset Disposal.
 *
 * Writes off a fixed asset. Carries the disposal reason + method, an
 * optional recoverable value (sale proceeds / salvage), and an approval
 * signature. The catalog row's `status` flips
 * to `disposed` at the action layer; no register movements are written
 * in the foundation phase.
 */
defineDocument({
  module: 'assets',
  name: 'disposal',
  label: { en: 'Asset Disposal', ru: 'Списание ОС', tr: 'Sabit Kıymet Silme' },
  pluralLabel: {
    en: 'Asset Disposals',
    ru: 'Списания ОС',
    tr: 'Sabit Kıymet Silmeleri',
  },
  icon: 'PackageMinus',
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
    reason: field.string({
      label: { en: 'Reason', ru: 'Причина', tr: 'Sebep' },
      maxLength: 256,
    }),
    disposalMethod: field.string({
      label: {
        en: 'Disposal Method',
        ru: 'Способ списания',
        tr: 'Silme Yöntemi',
      },
      maxLength: 32,
      enumValues: ['sold', 'scrapped', 'donated', 'lost', 'other'],
      enumLabels: {
        sold: { en: 'Sold', ru: 'Продано', tr: 'Satıldı' },
        scrapped: { en: 'Scrapped', ru: 'Утилизация', tr: 'Hurda' },
        donated: { en: 'Donated', ru: 'Передано безвозмездно', tr: 'Bağışlandı' },
        lost: { en: 'Lost', ru: 'Утрачено', tr: 'Kayıp' },
        other: { en: 'Other', ru: 'Прочее', tr: 'Diğer' },
      },
    }),
    recoverableValue: field.money({
      label: {
        en: 'Recoverable Value',
        ru: 'Возмещаемая стоимость',
        tr: 'Geri Kazanılabilir Değer',
      },
    }),
    approvedBy: field.string({
      label: { en: 'Approved By', ru: 'Утвердил', tr: 'Onaylayan' },
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
