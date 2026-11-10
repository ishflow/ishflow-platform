import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_NOTIFICATION_SETTINGS, parseNotificationSettings } from './settings';

const mockWithBypass = vi.hoisted(() => vi.fn());
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

describe('parseNotificationSettings', () => {
  it('returns defaults for null', () => {
    expect(parseNotificationSettings(null)).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('returns defaults for non-object', () => {
    expect(parseNotificationSettings('nope')).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    expect(parseNotificationSettings(123)).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    expect(parseNotificationSettings([])).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('merges partial column with defaults', () => {
    const result = parseNotificationSettings({
      invoiceSent: false,
      lowStockThreshold: 12,
    });
    expect(result).toEqual({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      invoiceSent: false,
      lowStockThreshold: 12,
    });
  });

  it('passes through a fully-populated valid object', () => {
    const full = {
      invoiceSent: false,
      paymentReceived: false,
      lowStockAlert: true,
      overduePayment: false,
      lowStockThreshold: 1,
      overdueDaysThreshold: 7,
    };
    expect(parseNotificationSettings(full)).toEqual(full);
  });

  it('falls back to defaults on invalid types', () => {
    expect(parseNotificationSettings({ lowStockThreshold: 'twelve', invoiceSent: 'yes' })).toEqual(
      DEFAULT_NOTIFICATION_SETTINGS,
    );
  });
});

describe('getNotificationSettings', () => {
  beforeEach(() => {
    mockWithBypass.mockReset();
  });

  it('returns defaults when tenant lookup yields null', async () => {
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        tenant: { findUnique: async () => null },
      }),
    );
    const { getNotificationSettings } = await import('./settings');
    const result = await getNotificationSettings('tenant-1');
    expect(result).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('returns defaults when notificationSettings column is null', async () => {
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        tenant: { findUnique: async () => ({ notificationSettings: null }) },
      }),
    );
    const { getNotificationSettings } = await import('./settings');
    expect(await getNotificationSettings('tenant-1')).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('merges partial column with defaults', async () => {
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        tenant: {
          findUnique: async () => ({ notificationSettings: { lowStockAlert: false } }),
        },
      }),
    );
    const { getNotificationSettings } = await import('./settings');
    expect(await getNotificationSettings('tenant-1')).toEqual({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      lowStockAlert: false,
    });
  });
});
