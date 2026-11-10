'use server';

/**
 * Server action that persists the operator's super-admin locale choice.
 *
 * The cookie is read by `getSuperAdminLocale()` on every RSC request inside
 * `/super-admin/*`. We revalidate the entire super-admin layout so that all
 * server-rendered strings (sidebar, breadcrumb, pages) re-render in the new
 * language without a hard reload.
 */

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import {
  SUPER_ADMIN_LOCALES,
  SUPER_ADMIN_LOCALE_COOKIE,
  type SuperAdminLocale,
} from '@/platform/super-admin/i18n';

export async function setSuperAdminLocale(locale: SuperAdminLocale): Promise<void> {
  if (!(SUPER_ADMIN_LOCALES as readonly string[]).includes(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(SUPER_ADMIN_LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });
  revalidatePath('/super-admin', 'layout');
}
