import { beforeEach, describe, expect, it } from 'vitest';
import { _resetSettingsRegistry, defineSettings, getSettingsRegistry } from './settings';
import type { LocalizedLabel } from './types';

describe('defineSettings', () => {
  beforeEach(() => {
    _resetSettingsRegistry();
  });

  it('registers a settings config and exposes it via the registry', () => {
    defineSettings({
      module: 'admin',
      name: 'branding',
      label: { en: 'Branding' } as LocalizedLabel,
      fields: {
        companyName: { type: 'string', label: { en: 'Company name' } as LocalizedLabel },
      },
    });
    const reg = getSettingsRegistry();
    const cfg = reg.settings.get('admin.branding');
    expect(cfg).toBeDefined();
    expect(cfg?.id).toBe('admin.branding');
    expect(cfg?.module).toBe('admin');
    expect(cfg?.scope).toBe('tenant'); // defaults to tenant
  });

  it('honors explicit scope=user', () => {
    defineSettings({
      module: 'settings',
      name: 'preferences',
      label: { en: 'Preferences' } as LocalizedLabel,
      scope: 'user',
      fields: {
        theme: { type: 'string', label: { en: 'Theme' } as LocalizedLabel },
      },
    });
    expect(getSettingsRegistry().settings.get('settings.preferences')?.scope).toBe('user');
  });

  it('rejects invalid module/name identifiers', () => {
    expect(() =>
      defineSettings({
        module: 'Admin', // pascal case rejected
        name: 'branding',
        label: { en: 'Branding' } as LocalizedLabel,
        fields: {},
      }),
    ).toThrow(/snake_case/);
  });

  it('rejects duplicate id', () => {
    defineSettings({
      module: 'admin',
      name: 'dup',
      label: { en: 'Dup' } as LocalizedLabel,
      fields: {},
    });
    expect(() =>
      defineSettings({
        module: 'admin',
        name: 'dup',
        label: { en: 'Dup again' } as LocalizedLabel,
        fields: {},
      }),
    ).toThrow(/already registered/);
  });
});
