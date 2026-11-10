import { defineSettings } from '@/platform/metadata/settings';

defineSettings({
  module: 'admin',
  name: 'general',
  label: { en: 'General', ru: 'Общие', tr: 'Genel' },
  fields: {
    workspaceName: {
      type: 'string',
      label: {
        en: 'Workspace name',
        ru: 'Название рабочего пространства',
        tr: 'Çalışma alanı adı',
      },
      maxLength: 120,
      placeholder: 'Acme Trading',
      group: 'workspace',
    },
    // The tenant's single operational currency. Loaded from `tenant.currency`
    // and saved back to it (see render-settings + settings-actions) — NOT a
    // free-form string. Drives all money formatting across the app.
    defaultCurrencyCode: {
      type: 'string',
      label: {
        en: 'Default currency',
        ru: 'Валюта по умолчанию',
        tr: 'Varsayılan para birimi',
      },
      enumValues: ['RUB', 'USD', 'EUR', 'TRY', 'KZT', 'KGS', 'UZS', 'CNY'] as const,
      enumLabels: {
        RUB: { en: 'RUB — Russian Ruble', ru: 'RUB — Российский рубль', tr: 'RUB — Rus Rublesi' },
        USD: { en: 'USD — US Dollar', ru: 'USD — Доллар США', tr: 'USD — ABD Doları' },
        EUR: { en: 'EUR — Euro', ru: 'EUR — Евро', tr: 'EUR — Euro' },
        TRY: { en: 'TRY — Turkish Lira', ru: 'TRY — Турецкая лира', tr: 'TRY — Türk Lirası' },
        KZT: {
          en: 'KZT — Kazakhstani Tenge',
          ru: 'KZT — Казахстанский тенге',
          tr: 'KZT — Kazak Tengesi',
        },
        KGS: { en: 'KGS — Kyrgyzstani Som', ru: 'KGS — Киргизский сом', tr: 'KGS — Kırgız Somu' },
        UZS: { en: 'UZS — Uzbek Som', ru: 'UZS — Узбекский сум', tr: 'UZS — Özbek Somu' },
        CNY: { en: 'CNY — Chinese Yuan', ru: 'CNY — Китайский юань', tr: 'CNY — Çin Yuanı' },
      },
      required: true,
      group: 'financial',
    },
    // Default VAT/tax rate lives ONLY in `admin.tax` (defaultTaxRatePct) — it's a
    // tax rule, not a workspace preference. Removed the duplicate that used to sit
    // here (see backlog #10 — settings IA dedup).
    rounding: {
      type: 'string',
      label: { en: 'Rounding mode', ru: 'Округление', tr: 'Yuvarlama' },
      enumValues: ['bankers', 'half_up', 'half_down'] as const,
      enumLabels: {
        bankers: { en: "Banker's rounding", ru: 'Банковское', tr: 'Bankacı yuvarlaması' },
        half_up: { en: 'Half up', ru: 'Округление вверх', tr: 'Yukarı yuvarla' },
        half_down: { en: 'Half down', ru: 'Округление вниз', tr: 'Aşağı yuvarla' },
      },
      default: 'bankers',
      group: 'financial',
    },
  },
});
