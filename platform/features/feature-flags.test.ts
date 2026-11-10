import { describe, expect, it } from 'vitest';
import { featureEnabled } from './feature-flags';

describe('featureEnabled', () => {
  it('returns true for a node with no feature key (always-on)', () => {
    expect(featureEnabled(new Set(), undefined)).toBe(true);
  });

  it('returns true when the key is in the enabled set', () => {
    expect(featureEnabled(new Set(['assets.fixed_asset']), 'assets.fixed_asset')).toBe(true);
  });

  it('returns false when the declared key is absent (default OFF)', () => {
    expect(featureEnabled(new Set(['other']), 'assets.fixed_asset')).toBe(false);
  });
});
