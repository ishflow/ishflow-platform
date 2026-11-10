import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const headersGet = vi.fn();
vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve({ get: headersGet })),
}));

const assertSuperAdmin = vi.fn();
vi.mock('@/platform/auth/assert-super-admin', () => ({
  assertSuperAdmin: () => assertSuperAdmin(),
}));

const getMaintenanceState = vi.fn();
const setMaintenanceState = vi.fn();
const getReadonlyEnabled = vi.fn();
const setReadonlyEnabled = vi.fn();
vi.mock('@/platform/super-admin/system/maintenance', () => ({
  getMaintenanceState: () => getMaintenanceState(),
  setMaintenanceState: (...args: unknown[]) => setMaintenanceState(...args),
  getReadonlyEnabled: () => getReadonlyEnabled(),
  setReadonlyEnabled: (...args: unknown[]) => setReadonlyEnabled(...args),
}));

const getPlatformSetting = vi.fn();
const setPlatformSetting = vi.fn();
const deletePlatformSetting = vi.fn();
const parseJsonValue = vi.fn();
vi.mock('@/platform/super-admin/system/platform-settings', () => ({
  getPlatformSetting: (...args: unknown[]) => getPlatformSetting(...args),
  setPlatformSetting: (...args: unknown[]) => setPlatformSetting(...args),
  deletePlatformSetting: (...args: unknown[]) => deletePlatformSetting(...args),
  parseJsonValue: (...args: unknown[]) => parseJsonValue(...args),
}));

const platformAuditLogCreate = vi.fn();
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ platformAuditLog: { create: platformAuditLogCreate } }),
}));

import {
  deletePlatformSettingAction,
  updateMaintenanceMode,
  updateReadonlyMode,
  upsertPlatformSetting,
} from './actions';

const ctx = {
  user: { id: 'user-internal', clerkId: 'clerk_42' },
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  assertSuperAdmin.mockResolvedValue(ctx);
  headersGet.mockReturnValue('vitest');
});

describe('updateMaintenanceMode', () => {
  it('persists the new state and writes an audit row when flipping ON', async () => {
    getMaintenanceState
      .mockResolvedValueOnce({ enabled: false, until: null, message: null })
      .mockResolvedValueOnce({ enabled: true, until: null, message: null });
    const fd = new FormData();
    fd.set('enabled', 'on');
    fd.set('until', '');
    fd.set('message', '');

    await updateMaintenanceMode(fd);

    expect(setMaintenanceState).toHaveBeenCalledWith(
      { enabled: true, until: null, message: null },
      'user-internal',
    );
    expect(platformAuditLogCreate).toHaveBeenCalledOnce();
    const audit = platformAuditLogCreate.mock.calls[0]?.[0];
    expect(audit?.data?.action).toBe('system.maintenance_on');
  });

  it('audits as system.maintenance_off when flipping OFF', async () => {
    getMaintenanceState
      .mockResolvedValueOnce({ enabled: true, until: null, message: null })
      .mockResolvedValueOnce({ enabled: false, until: null, message: null });
    const fd = new FormData();
    fd.set('until', '');
    fd.set('message', '');

    await updateMaintenanceMode(fd);

    expect(platformAuditLogCreate.mock.calls[0]?.[0]?.data?.action).toBe('system.maintenance_off');
  });

  it('rejects an invalid `until` timestamp', async () => {
    const fd = new FormData();
    fd.set('until', 'not-a-date');
    await expect(updateMaintenanceMode(fd)).rejects.toThrow('invalid `until` timestamp');
    expect(setMaintenanceState).not.toHaveBeenCalled();
  });
});

describe('updateReadonlyMode', () => {
  it('persists + audits when flipping ON', async () => {
    getReadonlyEnabled.mockResolvedValue(false);
    const fd = new FormData();
    fd.set('enabled', 'on');
    await updateReadonlyMode(fd);
    expect(setReadonlyEnabled).toHaveBeenCalledWith(true, 'user-internal');
    expect(platformAuditLogCreate).toHaveBeenCalledOnce();
    expect(platformAuditLogCreate.mock.calls[0]?.[0]?.data?.action).toBe('system.readonly_on');
  });

  it('no-ops when state already matches', async () => {
    getReadonlyEnabled.mockResolvedValue(true);
    const fd = new FormData();
    fd.set('enabled', 'on');
    await updateReadonlyMode(fd);
    expect(setReadonlyEnabled).not.toHaveBeenCalled();
    expect(platformAuditLogCreate).not.toHaveBeenCalled();
  });
});

describe('upsertPlatformSetting', () => {
  it('writes a setting_created audit row when key is new', async () => {
    getPlatformSetting.mockResolvedValue(null);
    parseJsonValue.mockReturnValue({ ok: true, value: true });
    const fd = new FormData();
    fd.set('key', 'feature.test');
    fd.set('value', 'true');

    await upsertPlatformSetting(fd);

    expect(setPlatformSetting).toHaveBeenCalledWith('feature.test', true, 'user-internal');
    const audit = platformAuditLogCreate.mock.calls[0]?.[0];
    expect(audit?.data?.action).toBe('system.setting_created');
  });

  it('writes a setting_updated audit row when key already exists', async () => {
    getPlatformSetting.mockResolvedValue({
      key: 'feature.test',
      value: false,
      updatedAt: new Date(),
      updatedBy: null,
    });
    parseJsonValue.mockReturnValue({ ok: true, value: true });
    const fd = new FormData();
    fd.set('key', 'feature.test');
    fd.set('value', 'true');

    await upsertPlatformSetting(fd);

    const audit = platformAuditLogCreate.mock.calls[0]?.[0];
    expect(audit?.data?.action).toBe('system.setting_updated');
  });

  it('throws on empty key', async () => {
    const fd = new FormData();
    fd.set('key', '   ');
    fd.set('value', 'true');
    await expect(upsertPlatformSetting(fd)).rejects.toThrow('settings.empty_key');
    expect(setPlatformSetting).not.toHaveBeenCalled();
  });

  it('throws on invalid JSON', async () => {
    parseJsonValue.mockReturnValue({ ok: false, error: 'invalid' });
    const fd = new FormData();
    fd.set('key', 'feature.test');
    fd.set('value', '{not-json');
    await expect(upsertPlatformSetting(fd)).rejects.toThrow(/settings\.invalid_json/);
    expect(setPlatformSetting).not.toHaveBeenCalled();
  });
});

describe('deletePlatformSettingAction', () => {
  it('writes a setting_deleted audit row when key exists', async () => {
    getPlatformSetting.mockResolvedValue({
      key: 'feature.test',
      value: true,
      updatedAt: new Date(),
      updatedBy: null,
    });
    const fd = new FormData();
    fd.set('key', 'feature.test');
    await deletePlatformSettingAction(fd);
    expect(deletePlatformSetting).toHaveBeenCalledWith('feature.test');
    const audit = platformAuditLogCreate.mock.calls[0]?.[0];
    expect(audit?.data?.action).toBe('system.setting_deleted');
  });

  it('no-ops when key does not exist', async () => {
    getPlatformSetting.mockResolvedValue(null);
    const fd = new FormData();
    fd.set('key', 'feature.missing');
    await deletePlatformSettingAction(fd);
    expect(deletePlatformSetting).not.toHaveBeenCalled();
    expect(platformAuditLogCreate).not.toHaveBeenCalled();
  });
});
