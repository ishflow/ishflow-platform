import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: vi.fn(),
}));

import { withBypass } from '@/platform/db/tenant-context';
import { loadEnabledFeatures } from './load-enabled-features';

describe('loadEnabledFeatures', () => {
  it('returns the set of keys with enabled=true', async () => {
    (withBypass as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (tx: unknown) => unknown) =>
        fn({
          featureFlag: {
            findMany: async () => [
              { key: 'assets.fixed_asset' },
              { key: 'treasury.cash_register' },
            ],
          },
        }),
    );
    const set = await loadEnabledFeatures();
    expect(set.has('assets.fixed_asset')).toBe(true);
    expect(set.has('treasury.cash_register')).toBe(true);
    expect(set.size).toBe(2);
  });
});
