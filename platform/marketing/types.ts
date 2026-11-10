/**
 * Shared types for the public marketing site sections.
 *
 * Every `MarketingSection` row's `content` JSON column must conform to
 * the type that matches its `(pageKey, sectionKey)`. The runtime falls
 * back to defaults in `default-sections.ts` when no DB row exists, so
 * the site renders correctly even before the CMS is populated.
 */

export interface CtaLink {
  label: string;
  href: string;
}

export interface HeroContent {
  eyebrow?: string;
  headline: string;
  subhead: string;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
  heroImageUrl?: string;
  trustItems?: string[];
}

export interface FeatureCard {
  id?: string;
  iconKey: string;
  icon?: string;
  title: string;
  body: string;
  href?: string;
}

export interface FeatureGridContent {
  cards: FeatureCard[];
}

export interface SocialProofStat {
  value: string;
  label: string;
}

export interface SocialProofContent {
  stats: SocialProofStat[];
  logos?: { name: string; logoUrl?: string }[];
}

export interface TestimonialItem {
  quote: string;
  authorName: string;
  authorRole: string;
  authorCompany: string;
  avatarUrl?: string;
}

export interface TestimonialsContent {
  items: TestimonialItem[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqContent {
  items: FaqItem[];
}

export interface FooterColumn {
  title: string;
  links: CtaLink[];
}

export interface FooterContent {
  columns: FooterColumn[];
  tagline?: string;
}

export interface CtaStripContent {
  headline: string;
  body?: string;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
}

export interface AddonSpotlightItem {
  addonKey: string;
  badge?: string;
  id?: string;
  tag?: string;
  price?: string;
  icon?: string;
  href?: string;
}

export interface AddonSpotlightContent {
  headline: string;
  body: string;
  items: AddonSpotlightItem[];
}

export interface DemoSectionContent {
  headline: string;
  body: string;
  imageUrl?: string;
  bullets?: string[];
}

export interface MarkdownContent {
  body: string;
}

export interface StatsStripItem {
  value: string;
  label: string;
  accent?: 'accent' | 'muted';
}

export interface StatsStripContent {
  items: StatsStripItem[];
}

export interface ShowcaseContent {
  eyebrow: string;
  headline: string;
  body: string;
  labels: [string, string, string];
}

export interface PricingTier {
  id: 'free' | 'starter' | 'pro' | 'business';
  name: string;
  price: string;
  priceSub: string;
  desc: string;
  features: string[];
  featured?: boolean;
  ctaLabel: string;
  ctaHref: string;
}

export interface PricingTableContent {
  tiers: PricingTier[];
  yearlyDiscountPct: number;
}

export interface PricingComparisonRow {
  feature: string;
  values: (boolean | string)[];
}

export interface PricingComparisonSection {
  section: string;
  rows: PricingComparisonRow[];
}

export interface PricingComparisonContent {
  tierNames: [string, string, string, string];
  tierPrices: [string, string, string, string];
  sections: PricingComparisonSection[];
}

export type SectionContent =
  | HeroContent
  | FeatureGridContent
  | SocialProofContent
  | TestimonialsContent
  | FaqContent
  | FooterContent
  | CtaStripContent
  | AddonSpotlightContent
  | DemoSectionContent
  | MarkdownContent
  | StatsStripContent
  | ShowcaseContent
  | PricingTableContent
  | PricingComparisonContent;
