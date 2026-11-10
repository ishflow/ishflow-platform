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

const getRawTokenById = vi.fn();
vi.mock('@/platform/super-admin/mobile/device-push-tokens', () => ({
  getRawTokenById: (...args: unknown[]) => getRawTokenById(...args),
}));

const getMinAppVersions = vi.fn();
const setMinAppVersion = vi.fn();
vi.mock('@/platform/super-admin/mobile/min-versions', () => ({
  getMinAppVersions: () => getMinAppVersions(),
  setMinAppVersion: (...args: unknown[]) => setMinAppVersion(...args),
}));

const sendPushToExpoTokens = vi.fn();
vi.mock('@/platform/notifications/push', () => ({
  sendPushToExpoTokens: (...args: unknown[]) => sendPushToExpoTokens(...args),
}));

const platformAuditLogCreate = vi.fn();
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ platformAuditLog: { create: platformAuditLogCreate } }),
}));

import { sendTestPushAction, updateMinAppVersions } from './actions';

const ctx = {
  user: { id: 'user-internal', clerkId: 'clerk_77' },
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  assertSuperAdmin.mockResolvedValue(ctx);
  headersGet.mockReturnValue('vitest');
});

describe('updateMinAppVersions', () => {
  it('writes both versions and audits the change', async () => {
    getMinAppVersions.mockResolvedValue({ ios: null, android: null });
    const fd = new FormData();
    fd.set('ios', '1.4.0');
    fd.set('android', '1.5.0');
    await updateMinAppVersions(fd);
    expect(setMinAppVersion).toHaveBeenCalledTimes(2);
    expect(setMinAppVersion).toHaveBeenCalledWith('ios', '1.4.0', 'user-internal');
    expect(setMinAppVersion).toHaveBeenCalledWith('android', '1.5.0', 'user-internal');
    const audit = platformAuditLogCreate.mock.calls[0]?.[0];
    expect(audit?.data?.action).toBe('mobile.min_versions_updated');
  });

  it('no-ops when neither version changed', async () => {
    getMinAppVersions.mockResolvedValue({ ios: '1.4.0', android: '1.5.0' });
    const fd = new FormData();
    fd.set('ios', '1.4.0');
    fd.set('android', '1.5.0');
    await updateMinAppVersions(fd);
    expect(setMinAppVersion).not.toHaveBeenCalled();
    expect(platformAuditLogCreate).not.toHaveBeenCalled();
  });

  it('clears versions when input is empty', async () => {
    getMinAppVersions.mockResolvedValue({ ios: '1.4.0', android: '1.5.0' });
    const fd = new FormData();
    fd.set('ios', '');
    fd.set('android', '');
    await updateMinAppVersions(fd);
    expect(setMinAppVersion).toHaveBeenCalledWith('ios', null, 'user-internal');
    expect(setMinAppVersion).toHaveBeenCalledWith('android', null, 'user-internal');
  });
});

describe('sendTestPushAction', () => {
  it('dispatches the push and writes a success audit row', async () => {
    getRawTokenById.mockResolvedValue('ExponentPushToken[abc]');
    sendPushToExpoTokens.mockResolvedValue({ ok: true, errors: [] });
    const fd = new FormData();
    fd.set('tokenId', '00000000-0000-0000-0000-000000000001');
    fd.set('title', 'Hi');
    fd.set('body', 'World');

    const result = await sendTestPushAction(fd);
    expect(result.ok).toBe(true);
    expect(sendPushToExpoTokens).toHaveBeenCalledWith(
      ['ExponentPushToken[abc]'],
      { title: 'Hi', body: 'World', data: { source: 'super_admin_test' } },
    );
    const audit = platformAuditLogCreate.mock.calls[0]?.[0];
    expect(audit?.data?.action).toBe('mobile.test_push_sent');
  });

  it('reports failure when the token does not exist', async () => {
    getRawTokenById.mockResolvedValue(null);
    const fd = new FormData();
    fd.set('tokenId', '00000000-0000-0000-0000-000000000002');
    const result = await sendTestPushAction(fd);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/);
    expect(sendPushToExpoTokens).not.toHaveBeenCalled();
    expect(platformAuditLogCreate).not.toHaveBeenCalled();
  });

  it('reports failure when Expo rejects the token (returns ok:false)', async () => {
    getRawTokenById.mockResolvedValue('ExponentPushToken[abc]');
    sendPushToExpoTokens.mockResolvedValue({ ok: false, errors: ['DeviceNotRegistered'] });
    const fd = new FormData();
    fd.set('tokenId', '00000000-0000-0000-0000-000000000004');
    const result = await sendTestPushAction(fd);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/DeviceNotRegistered/);
    expect(platformAuditLogCreate.mock.calls[0]?.[0]?.data?.action).toBe(
      'mobile.test_push_failed',
    );
  });

  it('writes a failure audit when the push throws', async () => {
    getRawTokenById.mockResolvedValue('ExponentPushToken[abc]');
    sendPushToExpoTokens.mockRejectedValue(new Error('boom'));
    const fd = new FormData();
    fd.set('tokenId', '00000000-0000-0000-0000-000000000003');
    const result = await sendTestPushAction(fd);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('boom');
    expect(platformAuditLogCreate.mock.calls[0]?.[0]?.data?.action).toBe(
      'mobile.test_push_failed',
    );
  });
});
