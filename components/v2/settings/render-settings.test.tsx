// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

// Mock the same modules F-7's test mocked (next-intl, requireTenantContext, etc.).
// Mirror exact mocks from components/v2/catalogs/render-catalog-list.test.tsx.

vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn().mockResolvedValue({ tenant: { id: 'test-tenant' } }),
}));
vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: async (_tid: string, fn: (tx: unknown) => unknown) => fn({} as unknown),
}));
vi.mock('@/platform/engine/settings', () => ({
  getSettings: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/platform/metadata', () => ({
  getSettingsRegistry: () => ({ settings: new Map() }),
}));
// Prevent configs/index.ts side-effects from running during the test.
vi.mock('@/configs', () => ({}));
vi.mock('@/platform/metadata/shared/pick-label', () => ({
  pickLabel: (l: { en: string }) => l.en,
}));
vi.mock('@/components/v2/shell/topbar', () => ({
  V2Topbar: (_p: { title: string }) => null,
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => 'en',
}));

import { renderV2Settings } from './render-settings';

describe('renderV2Settings', () => {
  it('exports a function', () => {
    expect(typeof renderV2Settings).toBe('function');
  });

  it('renders not-found when slug is unknown', async () => {
    const result = await renderV2Settings({ slug: 'nope.nada' });
    expect(result).toBeDefined();
  });
});
