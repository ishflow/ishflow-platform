import { describe, expect, it } from 'vitest';
import {
  ADDON_CATALOG,
  ADDON_KEYS,
  type AddonKey,
  getAddonEntry,
  isAddonKey,
  listAddonEntries,
} from './catalog';

describe('addon catalog', () => {
  it('exposes exactly 13 addon keys', () => {
    expect(ADDON_KEYS).toHaveLength(13);
  });

  it('every key has a catalog entry', () => {
    for (const key of ADDON_KEYS) {
      const entry = ADDON_CATALOG[key];
      expect(entry).toBeDefined();
      expect(entry.key).toBe(key);
      expect(entry.iconKey.length).toBeGreaterThan(0);
      expect(entry.navHref.startsWith('/addons/')).toBe(true);
      expect(['ga', 'beta', 'planned']).toContain(entry.status);
    }
  });

  it('navHrefs are unique', () => {
    const hrefs = ADDON_KEYS.map((k) => ADDON_CATALOG[k].navHref);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('isAddonKey accepts known keys and rejects unknowns', () => {
    expect(isAddonKey('ai_invoice_ocr')).toBe(true);
    expect(isAddonKey('not_a_real_addon')).toBe(false);
    expect(isAddonKey('')).toBe(false);
  });

  it('getAddonEntry returns the same entry as the lookup table', () => {
    const key: AddonKey = 'bank_integration';
    expect(getAddonEntry(key)).toBe(ADDON_CATALOG[key]);
  });

  it('listAddonEntries returns all entries in declaration order', () => {
    const list = listAddonEntries();
    expect(list).toHaveLength(13);
    expect(list[0]?.key).toBe(ADDON_KEYS[0]);
    expect(list[12]?.key).toBe(ADDON_KEYS[12]);
  });
});
