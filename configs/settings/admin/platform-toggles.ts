import { defineSettings } from '@/platform/metadata/settings';

defineSettings({
  module: 'admin',
  name: 'platform_toggles',
  label: {
    en: 'Platform toggles',
    ru: 'Переключатели платформы',
    tr: 'Platform anahtarları',
  },
  fields: {
    // Core
    multiwarehouseEnabled: {
      type: 'boolean',
      label: { en: 'Multi-warehouse', ru: 'Мульти-склад', tr: 'Çoklu depo' },
      default: true,
      group: 'core',
    },
    periodCloseEnabled: {
      type: 'boolean',
      label: { en: 'Period close', ru: 'Закрытие периода', tr: 'Dönem kapatma' },
      default: false,
      group: 'core',
    },
    approvalsEnabled: {
      type: 'boolean',
      label: { en: 'Approvals workflow', ru: 'Согласования', tr: 'Onay akışı' },
      default: false,
      group: 'core',
    },
    // Integrations
    bankImportEnabled: {
      type: 'boolean',
      label: {
        en: 'Bank statement import',
        ru: 'Импорт банковских выписок',
        tr: 'Banka ekstresi içe aktarma',
      },
      default: false,
      group: 'integrations',
    },
    aiOcrEnabled: {
      type: 'boolean',
      label: {
        en: 'AI OCR for receipts',
        ru: 'AI OCR для чеков',
        tr: 'Fişler için yapay zekâ OCR',
      },
      default: false,
      group: 'integrations',
    },
    oneCExportEnabled: {
      type: 'boolean',
      label: { en: '1C export', ru: 'Экспорт в 1С', tr: '1C dışa aktarma' },
      default: false,
      group: 'integrations',
    },
    // Advanced
    webhooksEnabled: {
      type: 'boolean',
      label: { en: 'Webhooks', ru: 'Webhooks', tr: 'Webhooks' },
      default: false,
      group: 'advanced',
    },
    apiTokensEnabled: {
      type: 'boolean',
      label: { en: 'API tokens', ru: 'API-токены', tr: 'API jetonları' },
      default: false,
      group: 'advanced',
    },
    auditExportEnabled: {
      type: 'boolean',
      label: {
        en: 'Audit log export',
        ru: 'Экспорт журнала аудита',
        tr: 'Denetim günlüğü dışa aktarma',
      },
      default: false,
      group: 'advanced',
    },
    ssoEnabled: {
      type: 'boolean',
      label: { en: 'Single sign-on (SSO)', ru: 'SSO', tr: 'Tekli oturum açma (SSO)' },
      default: false,
      group: 'advanced',
    },
  },
});
