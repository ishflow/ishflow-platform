import { getSettingsRegistry } from '@/platform/metadata/settings';
import { describe, expect, it } from 'vitest';
import './general';

describe('configs/settings/admin/general', () => {
  it('registers admin.general with enum rounding + grouped fields', () => {
    const cfg = getSettingsRegistry().settings.get('admin.general');
    expect(cfg).toBeDefined();

    const rounding = cfg?.fields.rounding;
    expect(rounding?.type).toBe('string');
    if (rounding?.type === 'string') {
      expect(rounding.enumValues).toEqual(['bankers', 'half_up', 'half_down']);
      expect(rounding.default).toBe('bankers');
    }

    expect(cfg?.fields.workspaceName?.group).toBe('workspace');
    expect(cfg?.fields.defaultCurrencyCode?.group).toBe('financial');
    // defaultVatRatePct was removed (duplicate of admin.tax.defaultTaxRatePct) — #10.
    expect(cfg?.fields.defaultVatRatePct).toBeUndefined();
  });
});
