import { describe, expect, it } from 'vitest';
import { ADDON_KEYS } from './catalog';
import { getAddonLabels } from './catalog-i18n';

describe('getAddonLabels', () => {
  it('returns hand-written EN labels for every catalog key', () => {
    for (const key of ADDON_KEYS) {
      const labels = getAddonLabels(key, 'en');
      expect(labels.title.length).toBeGreaterThan(0);
      expect(labels.description.length).toBeGreaterThan(0);
    }
  });

  it('returns RU labels distinct from EN labels', () => {
    const en = getAddonLabels('ai_invoice_ocr', 'en');
    const ru = getAddonLabels('ai_invoice_ocr', 'ru');
    expect(ru.title).not.toBe(en.title);
  });

  it('returns TR labels distinct from EN labels', () => {
    const en = getAddonLabels('bank_integration', 'en');
    const tr = getAddonLabels('bank_integration', 'tr');
    expect(tr.title).not.toBe(en.title);
  });

  it('falls back to EN for unknown locale', () => {
    const fallback = getAddonLabels('ai_invoice_ocr', 'xx');
    const en = getAddonLabels('ai_invoice_ocr', 'en');
    expect(fallback).toEqual(en);
  });

  it('accepts long locale tags (e.g. en-US)', () => {
    const long = getAddonLabels('ai_invoice_ocr', 'en-US');
    const en = getAddonLabels('ai_invoice_ocr', 'en');
    expect(long).toEqual(en);
  });
});
