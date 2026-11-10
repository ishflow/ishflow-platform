import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();
const findUnique = vi.fn();
const upsert = vi.fn();
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      platformSetting: { findMany, findUnique, upsert },
    }),
}));

import {
  clearMaintenanceCaches,
  getMaintenanceState,
  getReadonlyEnabled,
  setMaintenanceState,
  setReadonlyEnabled,
} from './maintenance';

beforeEach(() => {
  vi.clearAllMocks();
  clearMaintenanceCaches();
});

describe('getMaintenanceState', () => {
  it('returns enabled=false when no rows exist', async () => {
    findMany.mockResolvedValue([]);
    const state = await getMaintenanceState();
    expect(state).toEqual({ enabled: false, until: null, message: null });
  });

  it('parses string-form booleans gracefully', async () => {
    findMany.mockResolvedValue([
      { key: 'maintenance.enabled', value: 'true' },
      { key: 'maintenance.until', value: '2026-12-31T00:00:00.000Z' },
      { key: 'maintenance.message', value: 'see you soon' },
    ]);
    const state = await getMaintenanceState();
    expect(state.enabled).toBe(true);
    expect(state.until).toBe('2026-12-31T00:00:00.000Z');
    expect(state.message).toBe('see you soon');
  });

  it('falls back to safe defaults on DB error', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));
    const state = await getMaintenanceState();
    expect(state).toEqual({ enabled: false, until: null, message: null });
  });

  it('caches the result for the TTL window', async () => {
    findMany.mockResolvedValue([{ key: 'maintenance.enabled', value: true }]);
    await getMaintenanceState();
    await getMaintenanceState();
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});

describe('setMaintenanceState', () => {
  it('clears the cache after writing', async () => {
    findMany.mockResolvedValue([{ key: 'maintenance.enabled', value: false }]);
    upsert.mockResolvedValue({});
    await getMaintenanceState();
    expect(findMany).toHaveBeenCalledTimes(1);
    await setMaintenanceState({ enabled: true }, 'user-1');
    findMany.mockResolvedValue([{ key: 'maintenance.enabled', value: true }]);
    await getMaintenanceState();
    expect(findMany).toHaveBeenCalledTimes(2);
  });
});

describe('getReadonlyEnabled / setReadonlyEnabled', () => {
  it('returns false when row missing', async () => {
    findUnique.mockResolvedValue(null);
    const v = await getReadonlyEnabled();
    expect(v).toBe(false);
  });

  it('returns true when row stores true', async () => {
    findUnique.mockResolvedValue({ key: 'readonly.enabled', value: true });
    const v = await getReadonlyEnabled();
    expect(v).toBe(true);
  });

  it('writes the new value via upsert', async () => {
    upsert.mockResolvedValue({});
    await setReadonlyEnabled(true, 'user-1');
    expect(upsert).toHaveBeenCalledOnce();
  });
});
