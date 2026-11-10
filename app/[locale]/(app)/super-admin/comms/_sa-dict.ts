import { type SuperAdminDict, getDictForLocale } from '@/platform/super-admin/dict';
import { DEFAULT_LOCALE, isSuperAdminLocale } from '@/platform/super-admin/i18n';
import { getLocale } from 'next-intl/server';

/**
 * Super-admin communications (in-app announcements) dictionary bound to the
 * active ROUTE locale. Mirrors `cms/_sa-dict.ts`: the V2 `[locale]` shell never
 * sets the SA-locale cookie, so `getSuperAdminDict()` would always fall back to
 * the default locale. The route already carries the operator's locale, so we
 * bind the announcement-framed labels (surfaces / statuses / analytics) to it.
 */
export async function getSaCommsDict(): Promise<SuperAdminDict['communications']> {
  const loc = await getLocale();
  return getDictForLocale(isSuperAdminLocale(loc) ? loc : DEFAULT_LOCALE).communications;
}
