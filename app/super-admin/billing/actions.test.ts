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

const getSubscriptionFeatureState = vi.fn();
const setSubscriptionFeatureState = vi.fn();
vi.mock('@/platform/billing/feature-state', () => ({
  getSubscriptionFeatureState: () => getSubscriptionFeatureState(),
  setSubscriptionFeatureState: (...args: unknown[]) => setSubscriptionFeatureState(...args),
}));

const platformAuditLogCreate = vi.fn();
const withBypass = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
  fn({ platformAuditLog: { create: platformAuditLogCreate } }),
);
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: (fn: (tx: unknown) => Promise<unknown>) => withBypass(fn),
}));

import { updateGlobalBillingGate } from './actions';

const ctx = {
  user: { id: 'user-internal-id', clerkId: 'user_clerk_123' },
} as never;

function makeFormData(state: string): FormData {
  const fd = new FormData();
  fd.set('state', state);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  assertSuperAdmin.mockResolvedValue(ctx);
  headersGet.mockImplementation((key: string) => {
    if (key === 'x-forwarded-for') return '127.0.0.1';
    if (key === 'user-agent') return 'vitest';
    return null;
  });
});

describe('updateGlobalBillingGate', () => {
  it('throws on invalid state', async () => {
    await expect(updateGlobalBillingGate(makeFormData('bogus'))).rejects.toThrow('invalid state');
    expect(setSubscriptionFeatureState).not.toHaveBeenCalled();
    expect(platformAuditLogCreate).not.toHaveBeenCalled();
  });

  it('throws on missing state', async () => {
    const fd = new FormData();
    await expect(updateGlobalBillingGate(fd)).rejects.toThrow('invalid state');
    expect(setSubscriptionFeatureState).not.toHaveBeenCalled();
    expect(platformAuditLogCreate).not.toHaveBeenCalled();
  });

  it('no-ops when next state matches current state', async () => {
    getSubscriptionFeatureState.mockResolvedValue('enabled');
    await updateGlobalBillingGate(makeFormData('enabled'));
    expect(setSubscriptionFeatureState).not.toHaveBeenCalled();
    expect(platformAuditLogCreate).not.toHaveBeenCalled();
  });

  it('persists new state and writes audit row on real change', async () => {
    getSubscriptionFeatureState.mockResolvedValue('enabled');
    await updateGlobalBillingGate(makeFormData('hidden'));

    expect(setSubscriptionFeatureState).toHaveBeenCalledWith('hidden', 'user-internal-id');
    expect(platformAuditLogCreate).toHaveBeenCalledTimes(1);
    expect(platformAuditLogCreate).toHaveBeenCalledWith({
      data: {
        actorClerkId: 'user_clerk_123',
        action: 'gate.flipped',
        before: { state: 'enabled' },
        after: { state: 'hidden' },
        ip: '127.0.0.1',
        userAgent: 'vitest',
      },
    });
  });

  it('handles missing headers gracefully (null ip/userAgent)', async () => {
    headersGet.mockReturnValue(null);
    getSubscriptionFeatureState.mockResolvedValue('disabled');
    await updateGlobalBillingGate(makeFormData('enabled'));

    expect(platformAuditLogCreate).toHaveBeenCalledWith({
      data: {
        actorClerkId: 'user_clerk_123',
        action: 'gate.flipped',
        before: { state: 'disabled' },
        after: { state: 'enabled' },
        ip: null,
        userAgent: null,
      },
    });
  });
});
