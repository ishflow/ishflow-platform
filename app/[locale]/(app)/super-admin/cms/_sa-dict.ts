import { type SuperAdminDict, getDictForLocale } from '@/platform/super-admin/dict';
import { DEFAULT_LOCALE, isSuperAdminLocale } from '@/platform/super-admin/i18n';
import { getLocale } from 'next-intl/server';

/**
 * Super-admin marketing dictionary bound to the active ROUTE locale.
 *
 * The locale-free Tree A reads the SA-locale cookie, but the V2 (`[locale]`)
 * shell never sets that cookie — so `getSuperAdminDict()` would always fall
 * back to the default locale here. The route already carries the operator's
 * locale (and `SUPER_ADMIN_LOCALES` is a superset of the app locales), so we
 * bind the CMS body dictionary to it for parity with the next-intl shell.
 */
export async function getSaMarketingDict(): Promise<SuperAdminDict> {
  const loc = await getLocale();
  return getDictForLocale(isSuperAdminLocale(loc) ? loc : DEFAULT_LOCALE);
}
