import { describe, expect, it } from 'vitest';
import { collectFeatures } from './feature-catalog';

describe('collectFeatures', () => {
  it('includes the fixed-asset feature', () => {
    const keys = collectFeatures().map((f) => f.key);
    expect(keys).toContain('assets.fixed_asset');
  });

  it('carries the rail key for module grouping and de-duplicates', () => {
    const features = collectFeatures();
    const fa = features.find((f) => f.key === 'assets.fixed_asset');
    expect(fa?.railKey).toBe('catalogs');
    expect(fa?.i18nKey).toBe('catalogs.fixedAssets');
    expect(new Set(features.map((f) => f.key)).size).toBe(features.length);
  });
});
