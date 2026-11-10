// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getDefaultSection } from './default-sections';

const COVERAGE: Array<[string, string]> = [
  ['home', 'hero'],
  ['home', 'social_proof'],
  ['home', 'stats'],
  ['home', 'feature.cards'],
  ['home', 'addon.spotlight'],
  ['home', 'showcase'],
  ['home', 'testimonials'],
  ['home', 'faq'],
  ['home', 'cta'],
  ['pricing', 'table'],
  ['pricing', 'comparison'],
  ['pricing', 'addons'],
  ['pricing', 'faq'],
];

describe('default-sections coverage', () => {
  for (const [page, section] of COVERAGE) {
    for (const locale of ['ru', 'en', 'tr'] as const) {
      it(`${page}/${section} (${locale})`, () => {
        expect(getDefaultSection(page, section, locale)).not.toBeNull();
      });
    }
  }
});
