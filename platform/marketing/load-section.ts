/**
 * Section resolver — given `(pageKey, sectionKey, locale)`, returns the
 * content stored in `MarketingSection` if it exists, otherwise falls
 * back to a hard-coded default from `default-sections.ts`.
 *
 * Use this from every marketing page server component. The page never
 * 404s on a missing section because defaults always render.
 */

import { prisma } from '@/platform/db';
import { fallbackLocale } from '@/platform/i18n/config';
import { getDefaultSection } from './default-sections';
import type { SectionContent } from './types';

export async function loadSection<T extends SectionContent = SectionContent>(
  pageKey: string,
  sectionKey: string,
  locale: string,
): Promise<T | null> {
  const row = await loadFromDb(pageKey, sectionKey, locale);
  if (row) return row as T;
  return getDefaultSection<T>(pageKey, sectionKey, locale);
}

async function loadFromDb(
  pageKey: string,
  sectionKey: string,
  locale: string,
): Promise<SectionContent | null> {
  try {
    const direct = await prisma.marketingSection.findUnique({
      where: { pageKey_sectionKey_locale: { pageKey, sectionKey, locale } },
      select: { content: true },
    });
    if (direct?.content) return direct.content as unknown as SectionContent;

    if (locale !== fallbackLocale) {
      const fb = await prisma.marketingSection.findUnique({
        where: {
          pageKey_sectionKey_locale: {
            pageKey,
            sectionKey,
            locale: fallbackLocale,
          },
        },
        select: { content: true },
      });
      if (fb?.content) return fb.content as unknown as SectionContent;
    }
  } catch {
    // DB unavailable (e.g. build-time page-data collection) — fall back
    // to defaults silently.
    return null;
  }

  return null;
}
