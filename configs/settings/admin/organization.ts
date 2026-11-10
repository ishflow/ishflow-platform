import { defineSettings } from '@/platform/metadata/settings';

// Company legal identity — persisted to tenant_settings (key 'admin.organization').
// Distinct from `admin.general` (workspace name / locale / financial defaults):
// this holds the legal entity details shown on invoices and official documents.
defineSettings({
  module: 'admin',
  name: 'organization',
  label: { en: 'Organization', ru: 'Организация', tr: 'Kuruluş' },
  fields: {
    legalName: {
      type: 'string',
      label: { en: 'Legal name', ru: 'Юридическое название', tr: 'Yasal unvan' },
      maxLength: 200,
      placeholder: 'Sample Trading LLC',
      group: 'company',
    },
    taxId: {
      type: 'string',
      label: { en: 'Tax ID (VKN / INN)', ru: 'ИНН', tr: 'VKN / Vergi no' },
      maxLength: 32,
      group: 'company',
    },
    legalAddress: {
      type: 'string',
      label: { en: 'Legal address', ru: 'Юридический адрес', tr: 'Yasal adres' },
      maxLength: 300,
      group: 'company',
    },
    contactPhone: {
      type: 'string',
      label: { en: 'Phone', ru: 'Телефон', tr: 'Telefon' },
      maxLength: 40,
      group: 'contact',
    },
    contactEmail: {
      type: 'string',
      label: { en: 'Email', ru: 'Эл. почта', tr: 'E-posta' },
      maxLength: 120,
      group: 'contact',
    },
    website: {
      type: 'string',
      label: { en: 'Website', ru: 'Сайт', tr: 'Web sitesi' },
      maxLength: 120,
      group: 'contact',
    },
  },
});
