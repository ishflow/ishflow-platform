import type { AppContext } from '@/platform/auth/current-context';
import { describe, expect, it } from 'vitest';
import type { AddonKey } from './catalog';
import { hasAddon } from './has-addon';

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

describe('hasAddon', () => {
  it('returns true when the addon is present in the context set', () => {
    expect(hasAddon(ctxWithAddons(['ai_invoice_ocr']), 'ai_invoice_ocr')).toBe(true);
  });

  it('returns false when the addon set is empty', () => {
    expect(hasAddon(ctxWithAddons([]), 'ai_invoice_ocr')).toBe(false);
  });

  it('returns false when the addon set does not include the requested key', () => {
    expect(hasAddon(ctxWithAddons(['bank_integration']), 'ai_invoice_ocr')).toBe(false);
  });
});
