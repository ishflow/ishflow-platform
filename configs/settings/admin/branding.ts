import { defineSettings } from '@/platform/metadata/settings';

defineSettings({
  module: 'admin',
  name: 'branding',
  label: { en: 'Branding', ru: 'Брендинг', tr: 'Marka' },
  fields: {
    logoUrl: {
      type: 'string',
      label: { en: 'Logo URL', ru: 'URL логотипа', tr: 'Logo URL' },
      maxLength: 2048,
      placeholder: 'https://cdn.example.com/logo.svg',
    },
    primaryColor: {
      type: 'color',
      label: { en: 'Primary color', ru: 'Основной цвет', tr: 'Birincil renk' },
      default: '#0F5EEF',
      group: 'colors',
    },
    secondaryColor: {
      type: 'color',
      label: { en: 'Secondary color', ru: 'Дополнительный цвет', tr: 'İkincil renk' },
      default: '#000000',
      group: 'colors',
    },
    accentColor: {
      type: 'color',
      label: { en: 'Accent color', ru: 'Акцентный цвет', tr: 'Vurgu rengi' },
      default: '#B0E9FD',
      group: 'colors',
    },
    footerText: {
      type: 'text',
      label: { en: 'Footer text', ru: 'Текст подвала', tr: 'Alt bilgi metni' },
      placeholder: '© 2026 Company name',
      rows: 3,
    },
  },
});
