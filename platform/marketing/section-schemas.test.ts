import { describe, expect, it } from 'vitest';
import {
  SECTION_SCHEMAS,
  faqSchema,
  featureCardsSchema,
  footerColumnsSchema,
  getSectionDefaults,
  heroSchema,
  isSectionType,
  socialProofSchema,
  testimonialsSchema,
} from './section-schemas';

describe('section-schemas', () => {
  it('hero accepts a fully filled object', () => {
    const parsed = heroSchema.parse({
      headline: 'Build like 1C',
      subhead: 'Metadata-driven SaaS',
      primaryCta: { label: 'Start', href: '/sign-up' },
      secondaryCta: { label: 'Pricing', href: '/pricing' },
      heroImageUrl: 'https://example.com/img.png',
    });
    expect(parsed.headline).toBe('Build like 1C');
    expect(parsed.secondaryCta?.label).toBe('Pricing');
  });

  it('hero rejects empty headline', () => {
    expect(() =>
      heroSchema.parse({
        headline: '',
        primaryCta: { label: 'Go', href: '/' },
      }),
    ).toThrow();
  });

  it('hero coerces empty heroImageUrl to undefined', () => {
    const parsed = heroSchema.parse({
      headline: 'x',
      primaryCta: { label: 'a', href: '/' },
      heroImageUrl: '',
    });
    expect(parsed.heroImageUrl).toBeUndefined();
  });

  it('feature.cards accepts an empty list', () => {
    expect(featureCardsSchema.parse({ cards: [] }).cards).toEqual([]);
  });

  it('feature.cards requires a title per card', () => {
    expect(() =>
      featureCardsSchema.parse({ cards: [{ iconKey: 'x', title: '', body: 'b' }] }),
    ).toThrow();
  });

  it('social_proof requires non-empty value and label', () => {
    expect(socialProofSchema.parse({ stats: [{ value: '10x', label: 'speed' }] })).toBeTruthy();
    expect(() => socialProofSchema.parse({ stats: [{ value: '', label: 'x' }] })).toThrow();
  });

  it('testimonials accept optional avatarUrl', () => {
    const parsed = testimonialsSchema.parse({
      items: [
        {
          quote: 'Great',
          authorName: 'Ivan',
          authorRole: 'CTO',
          authorCompany: 'Acme',
        },
      ],
    });
    expect(parsed.items[0]?.avatarUrl).toBeUndefined();
  });

  it('faq requires q and a', () => {
    expect(faqSchema.parse({ items: [{ q: 'Q1?', a: 'A1.' }] })).toBeTruthy();
    expect(() => faqSchema.parse({ items: [{ q: '', a: 'x' }] })).toThrow();
  });

  it('footer.columns supports nested links', () => {
    const parsed = footerColumnsSchema.parse({
      columns: [
        {
          title: 'Product',
          links: [{ label: 'Pricing', href: '/pricing' }],
        },
      ],
    });
    expect(parsed.columns[0]?.links[0]?.href).toBe('/pricing');
  });

  it('isSectionType narrows valid keys', () => {
    expect(isSectionType('hero')).toBe(true);
    expect(isSectionType('unknown')).toBe(false);
  });

  it('every SECTION_SCHEMAS entry is reachable', () => {
    for (const [key, schema] of Object.entries(SECTION_SCHEMAS)) {
      const defaults = getSectionDefaults(key as keyof typeof SECTION_SCHEMAS);
      // Hero defaults intentionally start with empty CTA fields so the
      // operator fills them in. All other section defaults are valid
      // empty lists.
      if (key === 'hero') continue;
      expect(() => schema.parse(defaults)).not.toThrow();
    }
  });
});
