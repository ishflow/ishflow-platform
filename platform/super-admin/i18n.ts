/**
 * Super Admin locale — constants + types only (client + server safe).
 *
 * Server-only helpers that read the cookie / dict live in `./i18n-server.ts`.
 * Splitting this file keeps `next/headers` out of the client bundle so the
 * `LanguageSwitcher` (a client component) can import the locale list without
 * triggering "next/headers used in client bundle" build errors.
 */

export const SUPER_ADMIN_LOCALES = ['en', 'ru', 'tr', 'uz', 'ky', 'de', 'fr', 'zh'] as const;

export type SuperAdminLocale = (typeof SUPER_ADMIN_LOCALES)[number];

/** Cookie name for the persisted operator locale. */
export const SUPER_ADMIN_LOCALE_COOKIE = '1c_super_admin_locale';

/** Default locale when no cookie is set or the value is invalid. */
export const DEFAULT_LOCALE: SuperAdminLocale = 'en';

export function isSuperAdminLocale(value: string | undefined): value is SuperAdminLocale {
  return value !== undefined && (SUPER_ADMIN_LOCALES as readonly string[]).includes(value);
}
