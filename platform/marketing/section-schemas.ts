import { z } from 'zod';

/**
 * Section content schemas.
 *
 * Every `MarketingSection` row stores its content as JSON. The shape of
 * that JSON depends on the section's type ("hero", "feature.cards", etc.).
 *
 * The map below is the single source of truth for the editor: it lists
 * the section types we support, their Zod schemas, and a default value
 * used when the row doesn't exist yet (so the editor never opens an
 * empty form).
 *
 * Adding a new section type is a 3-step process:
 *  1. add its zod schema below,
 *  2. add it to `SECTION_TYPES`,
 *  3. (optional) add a custom editor component under
 *     `components/app/super-admin/marketing/section-forms/`.
 *
 * Only types declared here are renderable in the editor.
 */

const ctaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const heroSchema = z.object({
  headline: z.string().min(1),
  subhead: z.string().default(''),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema.optional(),
  heroImageUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  trustItems: z.array(z.string()).optional(),
});

export const featureCardsSchema = z.object({
  cards: z.array(
    z.object({
      id: z.string().optional(),
      iconKey: z.string().default(''),
      icon: z.string().optional(),
      title: z.string().min(1),
      body: z.string().default(''),
      href: z
        .string()
        .optional()
        .or(z.literal('').transform(() => undefined)),
    }),
  ),
});

export const statsStripSchema = z.object({
  items: z.array(
    z.object({
      value: z.string().min(1),
      label: z.string().min(1),
      accent: z.enum(['accent', 'muted']).optional(),
    }),
  ),
});

export const showcaseSchema = z.object({
  eyebrow: z.string().default(''),
  headline: z.string().min(1),
  body: z.string().default(''),
  labels: z.tuple([z.string(), z.string(), z.string()]),
});

const pricingTierSchema = z.object({
  id: z.enum(['free', 'starter', 'pro', 'business']),
  name: z.string().min(1),
  price: z.string().default(''),
  priceSub: z.string().default(''),
  desc: z.string().default(''),
  features: z.array(z.string()),
  featured: z.boolean().optional(),
  ctaLabel: z.string().min(1),
  ctaHref: z.string().min(1),
});

export const pricingTableSchema = z.object({
  tiers: z.array(pricingTierSchema),
  yearlyDiscountPct: z.number(),
});

const pricingComparisonRowSchema = z.object({
  feature: z.string().min(1),
  values: z.array(z.union([z.boolean(), z.string()])),
});

const pricingComparisonSectionSchema = z.object({
  section: z.string().min(1),
  rows: z.array(pricingComparisonRowSchema),
});

export const pricingComparisonSchema = z.object({
  tierNames: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  tierPrices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  sections: z.array(pricingComparisonSectionSchema),
});

export const socialProofSchema = z.object({
  stats: z.array(
    z.object({
      value: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
});

export const testimonialsSchema = z.object({
  items: z.array(
    z.object({
      quote: z.string().min(1),
      authorName: z.string().min(1),
      authorRole: z.string().default(''),
      authorCompany: z.string().default(''),
      avatarUrl: z
        .string()
        .url()
        .optional()
        .or(z.literal('').transform(() => undefined)),
    }),
  ),
});

export const faqSchema = z.object({
  items: z.array(
    z.object({
      q: z.string().min(1),
      a: z.string().min(1),
    }),
  ),
});

export const footerColumnsSchema = z.object({
  columns: z.array(
    z.object({
      title: z.string().min(1),
      links: z.array(
        z.object({
          label: z.string().min(1),
          href: z.string().min(1),
        }),
      ),
    }),
  ),
});

export type HeroContent = z.infer<typeof heroSchema>;
export type FeatureCardsContent = z.infer<typeof featureCardsSchema>;
export type SocialProofContent = z.infer<typeof socialProofSchema>;
export type TestimonialsContent = z.infer<typeof testimonialsSchema>;
export type FaqContent = z.infer<typeof faqSchema>;
export type FooterColumnsContent = z.infer<typeof footerColumnsSchema>;
export type StatsStripContent = z.infer<typeof statsStripSchema>;
export type ShowcaseContent = z.infer<typeof showcaseSchema>;
export type PricingTableContent = z.infer<typeof pricingTableSchema>;
export type PricingComparisonContent = z.infer<typeof pricingComparisonSchema>;

export type SectionType =
  | 'hero'
  | 'feature.cards'
  | 'social_proof'
  | 'testimonials'
  | 'faq'
  | 'footer.columns';

/**
 * Section types added by the 2026-05 marketing redesign. They are tracked
 * separately from `SectionType` so the pre-existing Super Admin CMS
 * editor (which exhaustively switches over `SectionType`) does not need
 * to be updated in lock-step. Wave 4/5 components read schemas + catalog
 * entries from these `EXTENDED_*` exports.
 */
export type ExtendedSectionType =
  | SectionType
  | 'stats'
  | 'showcase'
  | 'pricing.table'
  | 'pricing.comparison';

/** Map a section type to its Zod schema. */
export const SECTION_SCHEMAS: Record<SectionType, z.ZodTypeAny> = {
  hero: heroSchema,
  'feature.cards': featureCardsSchema,
  social_proof: socialProofSchema,
  testimonials: testimonialsSchema,
  faq: faqSchema,
  'footer.columns': footerColumnsSchema,
};

/**
 * Superset of `SECTION_SCHEMAS` that also includes the new redesign
 * section types. Use this when validating arbitrary section content for
 * the new marketing site.
 */
export const EXTENDED_SECTION_SCHEMAS: Record<ExtendedSectionType, z.ZodTypeAny> = {
  ...SECTION_SCHEMAS,
  stats: statsStripSchema,
  showcase: showcaseSchema,
  'pricing.table': pricingTableSchema,
  'pricing.comparison': pricingComparisonSchema,
};

export interface SectionTypeInfo {
  /** Section key (e.g. "hero"). Used in the URL. */
  key: SectionType;
  /** Default content shape used when the row doesn't exist yet. */
  defaults: unknown;
}

export interface ExtendedSectionTypeInfo {
  key: ExtendedSectionType;
  defaults: unknown;
}

export const SECTION_TYPES: ReadonlyArray<SectionTypeInfo> = [
  {
    key: 'hero',
    defaults: {
      headline: '',
      subhead: '',
      primaryCta: { label: '', href: '' },
    } satisfies HeroContent,
  },
  {
    key: 'feature.cards',
    defaults: { cards: [] } satisfies FeatureCardsContent,
  },
  {
    key: 'social_proof',
    defaults: { stats: [] } satisfies SocialProofContent,
  },
  {
    key: 'testimonials',
    defaults: { items: [] } satisfies TestimonialsContent,
  },
  {
    key: 'faq',
    defaults: { items: [] } satisfies FaqContent,
  },
  {
    key: 'footer.columns',
    defaults: { columns: [] } satisfies FooterColumnsContent,
  },
];

/**
 * Superset of `SECTION_TYPES` that adds defaults for the redesign-only
 * section types (`stats`, `showcase`, `pricing.table`,
 * `pricing.comparison`).
 */
export const EXTENDED_SECTION_TYPES: ReadonlyArray<ExtendedSectionTypeInfo> = [
  ...SECTION_TYPES,
  {
    key: 'stats',
    defaults: { items: [] } satisfies StatsStripContent,
  },
  {
    key: 'showcase',
    defaults: {
      eyebrow: '',
      headline: 'Showcase',
      body: '',
      labels: ['', '', ''],
    } satisfies ShowcaseContent,
  },
  {
    key: 'pricing.table',
    defaults: { tiers: [], yearlyDiscountPct: 0 } satisfies PricingTableContent,
  },
  {
    key: 'pricing.comparison',
    defaults: {
      tierNames: ['', '', '', ''],
      tierPrices: ['', '', '', ''],
      sections: [],
    } satisfies PricingComparisonContent,
  },
];

export function isSectionType(value: string): value is SectionType {
  return value in SECTION_SCHEMAS;
}

export function isExtendedSectionType(value: string): value is ExtendedSectionType {
  return value in EXTENDED_SECTION_SCHEMAS;
}

export function getSectionDefaults(key: SectionType): unknown {
  return SECTION_TYPES.find((t) => t.key === key)?.defaults ?? {};
}

export function getExtendedSectionDefaults(key: ExtendedSectionType): unknown {
  return EXTENDED_SECTION_TYPES.find((t) => t.key === key)?.defaults ?? {};
}
