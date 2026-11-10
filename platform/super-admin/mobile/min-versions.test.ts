import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();
const upsert = vi.fn();
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ platformSetting: { findMany, upsert } }),
}));

import { getMinAppVersions, setMinAppVersion } from './min-versions';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getMinAppVersions', () => {
  it('parses string-valued rows', async () => {
    findMany.mockResolvedValue([
      { key: 'mobile.min_version_ios', value: '1.4.0' },
      { key: 'mobile.min_version_android', value: '1.5.0' },
    ]);
    const v = await getMinAppVersions();
    expect(v.ios).toBe('1.4.0');
    expect(v.android).toBe('1.5.0');
  });

  it('returns nulls when no rows present', async () => {
    findMany.mockResolvedValue([]);
    const v = await getMinAppVersions();
    expect(v).toEqual({ ios: null, android: null });
  });

  it('falls back gracefully on DB error', async () => {
    findMany.mockRejectedValue(new Error('boom'));
    const v = await getMinAppVersions();
    expect(v).toEqual({ ios: null, android: null });
  });
});

describe('setMinAppVersion', () => {
  it('persists a non-empty version', async () => {
    upsert.mockResolvedValue({});
    await setMinAppVersion('ios', '1.6.0', 'user-1');
    expect(upsert).toHaveBeenCalledOnce();
    const call = upsert.mock.calls[0]?.[0];
    expect(call?.where?.key).toBe('mobile.min_version_ios');
  });

  it('persists JsonNull when clearing the version', async () => {
    upsert.mockResolvedValue({});
    await setMinAppVersion('android', null, 'user-1');
    expect(upsert).toHaveBeenCalledOnce();
  });
});
