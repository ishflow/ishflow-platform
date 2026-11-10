import { defineDocument, field } from '@/platform/metadata';

/**
 * `assets.commissioning` — Принятие к учёту ОС / Asset Commissioning.
 *
 * Puts a registered asset into service. Functionally a status-change
 * document: it carries no monetary amount and no currency, only the
 * lifecycle metadata (date of commissioning, responsible person,
 * location, approval). The status transition itself (`registered` →
 * `in_use` on the catalog row) is handled at the action layer by the
 * doc's future workflow, not by the engine.
 */
defineDocument({
  module: 'assets',
  name: 'commissioning',
  label: {
    en: 'Asset Commissioning',
    ru: 'Принятие к учёту ОС',
    tr: 'Sabit Kıymet İşletmeye Alma',
  },
  pluralLabel: {
    en: 'Asset Commissionings',
    ru: 'Принятия к учёту ОС',
    tr: 'Sabit Kıymet İşletmeye Almaları',
  },
  icon: 'CheckCircle2',
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
    location: field.string({
      label: { en: 'Location', ru: 'Местонахождение', tr: 'Lokasyon' },
      maxLength: 128,
    }),
    responsibleId: field.string({
      label: { en: 'Responsible', ru: 'МОЛ', tr: 'Sorumlu' },
      maxLength: 128,
    }),
    commissionNotes: field.text({
      label: {
        en: 'Commissioning Notes',
        ru: 'Комментарий по вводу в эксплуатацию',
        tr: 'İşletmeye Alma Notları',
      },
    }),
    workflowStatus: field.string({
      label: { en: 'Status', ru: 'Статус', tr: 'Durum' },
      formHidden: true,
      maxLength: 32,
    }),
    approvedBy: field.string({
      label: { en: 'Approved By', ru: 'Утвердил', tr: 'Onaylayan' },
      maxLength: 128,
    }),
  },
  lines: {},
  posting: {},
  permissions: { read: 'any' },
  displayField: 'asset',
});
