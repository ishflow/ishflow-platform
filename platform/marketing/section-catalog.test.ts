import { describe, expect, it } from 'vitest';
import {
  MARKETING_EDITOR_LOCALES,
  MARKETING_PAGES,
  findPage,
  findSection,
  isMarketingEditorLocale,
} from './section-catalog';

describe('section-catalog', () => {
  it('contains the home page with hero and feature.cards', () => {
    const home = findPage('home');
    expect(home).toBeDefined();
    expect(home?.sections.map((s) => s.sectionKey)).toContain('hero');
    expect(home?.sections.map((s) => s.sectionKey)).toContain('feature.cards');
  });

  it('returns undefined for unknown page/section', () => {
    expect(findPage('not-a-page')).toBeUndefined();
    expect(findSection('home', 'unknown')).toBeUndefined();
  });

  it('exposes EN/RU/TR as editor locales', () => {
    expect(MARKETING_EDITOR_LOCALES).toEqual(['en', 'ru', 'tr']);
    expect(isMarketingEditorLocale('ru')).toBe(true);
    expect(isMarketingEditorLocale('uz')).toBe(false);
  });

  it('every page has at least one section', () => {
    for (const page of MARKETING_PAGES) {
      expect(page.sections.length).toBeGreaterThan(0);
    }
  });
});
