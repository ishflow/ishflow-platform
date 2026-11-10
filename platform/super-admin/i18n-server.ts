/**
 * Server-only super-admin locale helpers. Imports `next/headers`, so it must
 * never be pulled into a client bundle. Client code should import from
 * `./i18n` (constants + types only).
 */

// Server-only — never import this file from a client component.
import { cookies } from 'next/headers';

import { type SuperAdminDict, getDictForLocale } from './dict';
import {
  DEFAULT_LOCALE,
  SUPER_ADMIN_LOCALE_COOKIE,
  type SuperAdminLocale,
  isSuperAdminLocale,
} from './i18n';

/**
 * Read the active super-admin locale from the cookie store. Returns the
 * default locale when the cookie is missing or its value is not in the
 * allowed set.
 */
export async function getSuperAdminLocale(): Promise<SuperAdminLocale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SUPER_ADMIN_LOCALE_COOKIE)?.value;
  return isSuperAdminLocale(raw) ? raw : DEFAULT_LOCALE;
}

/** Fetch the dictionary for the active locale in one call. */
export async function getSuperAdminDict(): Promise<SuperAdminDict> {
  return getDictForLocale(await getSuperAdminLocale());
}
