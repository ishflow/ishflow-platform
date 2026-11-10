import { describe, expect, it } from 'vitest';

describe('smoke', () => {
  it('runs vitest with globals enabled', () => {
    expect(1 + 1).toBe(2);
  });

  it('resolves the @ alias to the i18n config', async () => {
    const mod = await import('@/platform/i18n/config');
    expect(mod.locales).toContain('ru');
    expect(mod.defaultLocale).toBe('ru');
  });
});
