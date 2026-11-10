import type { AppContext } from '@/platform/auth/current-context';
import { describe, expect, it } from 'vitest';
import { AddonDisabledError, assertAddonEnabled } from './assert-addon';
import type { AddonKey } from './catalog';

function ctxWithAddons(addons: AddonKey[]): AppContext {
  return {
    user: {} as AppContext['user'],
    tenant: null,
    membership: null,
    permissions: new Set(),
    scopesByEntity: new Map(),
    addons: new Set(addons),
  };
}

describe('assertAddonEnabled', () => {
  it('is a no-op when the addon is enabled', () => {
    expect(() =>
      assertAddonEnabled(ctxWithAddons(['bank_integration']), 'bank_integration'),
    ).not.toThrow();
  });

  it('throws AddonDisabledError when the addon is not enabled', () => {
    expect(() => assertAddonEnabled(ctxWithAddons([]), 'ai_invoice_ocr')).toThrow(
      AddonDisabledError,
    );
  });

  it('error message carries the addon key', () => {
    let caught: AddonDisabledError | null = null;
    try {
      assertAddonEnabled(ctxWithAddons([]), 'ai_query');
    } catch (e) {
      caught = e as AddonDisabledError;
    }
    expect(caught).toBeInstanceOf(AddonDisabledError);
    expect(caught?.key).toBe('ai_query');
    expect(caught?.toJSON()).toEqual({ error: 'addon_disabled', addon: 'ai_query' });
  });
});
