import { defineSettings } from '@/platform/metadata/settings';

defineSettings({
  module: 'admin',
  name: 'tax',
  label: { en: 'Tax', ru: 'Налоги', tr: 'Vergi' },
  fields: {
    country: {
      type: 'string',
      label: { en: 'Country', ru: 'Страна', tr: 'Ülke' },
      enumValues: ['KG', 'RU', 'TR', 'KZ', 'UZ'] as const,
      enumLabels: {
        KG: { en: 'Kyrgyzstan', ru: 'Кыргызстан', tr: 'Kırgızistan' },
        RU: { en: 'Russia', ru: 'Россия', tr: 'Rusya' },
        TR: { en: 'Türkiye', ru: 'Турция', tr: 'Türkiye' },
        KZ: { en: 'Kazakhstan', ru: 'Казахстан', tr: 'Kazakistan' },
        UZ: { en: 'Uzbekistan', ru: 'Узбекистан', tr: 'Özbekistan' },
      },
      default: 'KG',
    },
    // Master on/off. When false, NO tax is charged and the VAT line/word is
    // hidden everywhere (wizard totals, document totals, AR/AP, VAT report).
    // Default off → zero behavior change for existing tenants until opted in.
    taxEnabled: {
      type: 'boolean',
      label: {
        en: 'Charge tax (VAT)',
        ru: 'Начислять налог (НДС)',
        tr: 'Vergi (KDV) uygula',
      },
      default: false,
    },
    // The VAT / tax NUMBER is legal-entity identity — it lives ONLY in
    // `admin.organization` (taxId), shown on the Kuruluş page. Removed the
    // duplicate that used to sit here (see backlog #10 — settings IA dedup).
    defaultTaxRatePct: {
      type: 'number',
      label: {
        en: 'Default tax rate (%)',
        ru: 'Ставка налога по умолчанию (%)',
        tr: 'Varsayılan vergi oranı (%)',
      },
      min: 0,
      max: 100,
      default: 12,
      suffix: '%',
    },
    // Tax is EXCLUSIVE only (added on top of the price). The former
    // `taxInclusivePricing` toggle was removed — see
    // the internal design spec.
  },
});
