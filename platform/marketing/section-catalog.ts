import type { ExtendedSectionType, SectionType } from './section-schemas';

/**
 * Catalog of marketing pages and the sections they own.
 *
 * The CMS editor lists pages and sections from this constant — adding a
 * new section to a page is just appending an entry below. The public site
 * decides at render time whether to fetch from DB (if the row exists)
 * or fall back to the default content.
 */

export interface PageSection {
  /** Section key (e.g. "hero", "feature.cards"). */
  sectionKey: string;
  /** Section type used to pick the editor + validation schema. */
  type: SectionType;
  /** Human label shown in the section list (English; localised in dict). */
  label: string;
}

export interface MarketingPage {
  /** Page key stored in DB. */
  pageKey: string;
  /** English label shown in the page list (localised via dict). */
  label: string;
  sections: ReadonlyArray<PageSection>;
}

export const MARKETING_PAGES: ReadonlyArray<MarketingPage> = [
  {
    pageKey: 'home',
    label: 'Home',
    sections: [
      { sectionKey: 'hero', type: 'hero', label: 'Hero' },
      { sectionKey: 'feature.cards', type: 'feature.cards', label: 'Feature cards' },
      { sectionKey: 'social_proof', type: 'social_proof', label: 'Social proof' },
      { sectionKey: 'testimonials', type: 'testimonials', label: 'Testimonials' },
    ],
  },
  {
    pageKey: 'pricing',
    label: 'Pricing',
    sections: [{ sectionKey: 'faq', type: 'faq', label: 'FAQ' }],
  },
  {
    pageKey: 'features',
    label: 'Features',
    sections: [
      { sectionKey: 'hero', type: 'hero', label: 'Hero' },
      { sectionKey: 'feature.cards', type: 'feature.cards', label: 'Feature cards' },
    ],
  },
  {
    pageKey: 'addons',
    label: 'Add-ons',
    sections: [
      { sectionKey: 'hero', type: 'hero', label: 'Hero' },
      { sectionKey: 'feature.cards', type: 'feature.cards', label: 'Add-on cards' },
    ],
  },
  {
    pageKey: 'about',
    label: 'About',
    sections: [
      { sectionKey: 'hero', type: 'hero', label: 'Hero' },
      { sectionKey: 'social_proof', type: 'social_proof', label: 'Stats' },
    ],
  },
  {
    pageKey: 'contact',
    label: 'Contact',
    sections: [{ sectionKey: 'hero', type: 'hero', label: 'Hero' }],
  },
  {
    pageKey: 'global',
    label: 'Global (footer, nav)',
    sections: [{ sectionKey: 'footer.columns', type: 'footer.columns', label: 'Footer columns' }],
  },
];

export function findPage(pageKey: string): MarketingPage | undefined {
  return MARKETING_PAGES.find((p) => p.pageKey === pageKey);
}

export function findSection(pageKey: string, sectionKey: string): PageSection | undefined {
  return findPage(pageKey)?.sections.find((s) => s.sectionKey === sectionKey);
}

/**
 * Section entry that allows the new redesign-only section types. Mirrors
 * `PageSection` but with a widened `type` field. Used by the public
 * marketing site (Wave 4/5) without touching the narrow `PageSection`
 * shape consumed by the Super Admin CMS.
 */
export interface ExtendedPageSection {
  sectionKey: string;
  type: ExtendedSectionType;
  label: string;
}

export interface ExtendedMarketingPage {
  pageKey: string;
  label: string;
  sections: ReadonlyArray<ExtendedPageSection>;
}

/**
 * Catalog used by the new public marketing site. Includes every page +
 * section in `MARKETING_PAGES` plus the redesign-only entries registered
 * below (home/stats, home/showcase, pricing/table, pricing/comparison).
 */
export const EXTENDED_MARKETING_PAGES: ReadonlyArray<ExtendedMarketingPage> = MARKETING_PAGES.map(
  (page) => {
    if (page.pageKey === 'home') {
      return {
        ...page,
        sections: [
          ...page.sections,
          { sectionKey: 'stats', type: 'stats', label: 'Stats strip' },
          { sectionKey: 'showcase', type: 'showcase', label: 'Showcase' },
        ],
      };
    }
    if (page.pageKey === 'pricing') {
      return {
        ...page,
        sections: [
          ...page.sections,
          { sectionKey: 'table', type: 'pricing.table', label: 'Pricing table' },
          { sectionKey: 'comparison', type: 'pricing.comparison', label: 'Pricing comparison' },
        ],
      };
    }
    return page;
  },
);

export function findExtendedPage(pageKey: string): ExtendedMarketingPage | undefined {
  return EXTENDED_MARKETING_PAGES.find((p) => p.pageKey === pageKey);
}

export function findExtendedSection(
  pageKey: string,
  sectionKey: string,
): ExtendedPageSection | undefined {
  return findExtendedPage(pageKey)?.sections.find((s) => s.sectionKey === sectionKey);
}

/**
 * Locales offered by the editor. EN/RU/TR are the primary translation
 * targets per project policy; the public site falls back to EN for the
 * other 5 locales until the operator fills them in.
 */
export const MARKETING_EDITOR_LOCALES = ['en', 'ru', 'tr'] as const;
export type MarketingEditorLocale = (typeof MARKETING_EDITOR_LOCALES)[number];

export function isMarketingEditorLocale(value: string): value is MarketingEditorLocale {
  return (MARKETING_EDITOR_LOCALES as readonly string[]).includes(value);
}
