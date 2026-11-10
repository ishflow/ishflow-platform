import { getSettingsRegistry } from '@/platform/metadata/settings';
import { describe, expect, it } from 'vitest';
import './branding';

describe('configs/settings/admin/branding', () => {
  it('registers admin.branding with colors group + color fields', () => {
    const cfg = getSettingsRegistry().settings.get('admin.branding');
    expect(cfg).toBeDefined();
    expect(cfg?.module).toBe('admin');
    expect(cfg?.name).toBe('branding');

    const primary = cfg?.fields.primaryColor;
    expect(primary?.type).toBe('color');
    expect(primary?.group).toBe('colors');
    expect((primary as { default?: string }).default).toBe('#0F5EEF');

    const footer = cfg?.fields.footerText;
    expect(footer?.type).toBe('text');
    expect(footer?.group).toBeUndefined();

    const logo = cfg?.fields.logoUrl;
    expect(logo?.type).toBe('string');
  });
});
