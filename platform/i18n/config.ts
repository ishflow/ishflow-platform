export const locales = ['ru', 'en', 'tr', 'uz', 'ky', 'de', 'fr', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ru';
export const fallbackLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  tr: 'Türkçe',
  uz: 'Oʻzbekcha',
  ky: 'Кыргызча',
  de: 'Deutsch',
  fr: 'Français',
  zh: '中文',
};

export const localeFlags: Record<Locale, string> = {
  ru: '🇷🇺',
  en: '🇬🇧',
  tr: '🇹🇷',
  uz: '🇺🇿',
  ky: '🇰🇬',
  de: '🇩🇪',
  fr: '🇫🇷',
  zh: '🇨🇳',
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
