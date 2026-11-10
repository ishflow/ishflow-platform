import type { EmailLocale } from '@/platform/email/send-invoice-sent';

export function normalizeEmailLocale(locale: string | null | undefined): EmailLocale {
  if (locale === 'ru' || locale === 'tr') return locale;
  return 'en';
}

export const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? 'https://ishflow.com';
