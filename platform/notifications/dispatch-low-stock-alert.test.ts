import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithBypass = vi.hoisted(() => vi.fn());
const mockWithTenant = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn(async () => ({ id: 'em' })));
const mockGetSettings = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
  withTenant: mockWithTenant,
}));
vi.mock('@/platform/email/send-low-stock-alert', () => ({ sendLowStockAlertEmail: mockSend }));
vi.mock('./settings', () => ({ getNotificationSettings: mockGetSettings }));

const { dispatchLowStockAlert } = await import('./dispatch-low-stock-alert');

const FULL_SETTINGS = {
  invoiceSent: true,
  paymentReceived: true,
  lowStockAlert: true,
  overduePayment: true,
  lowStockThreshold: 5,
  overdueDaysThreshold: 30,
};

beforeEach(() => {
  mockWithBypass.mockReset();
  mockWithTenant.mockReset();
  mockSend.mockClear();
  mockGetSettings.mockReset();
  vi.stubEnv('RESEND_API_KEY', 'test_key');
});
afterEach(() => {
  vi.stubEnv('RESEND_API_KEY', '');
});

describe('dispatchLowStockAlert', () => {
  it('skips when RESEND_API_KEY missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await dispatchLowStockAlert('t1')).toEqual({ emails: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips when lowStockAlert setting is off', async () => {
    mockGetSettings.mockResolvedValue({ ...FULL_SETTINGS, lowStockAlert: false });
    expect(await dispatchLowStockAlert('t1')).toEqual({ emails: 0 });
  });

  it('skips when there are no low-stock products', async () => {
    mockGetSettings.mockResolvedValue(FULL_SETTINGS);
    mockWithTenant.mockImplementation(
      async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          movement_inventory_stock_balance: {
            groupBy: async (args: { where: { kind: 'income' | 'expense' } }) =>
              args.where.kind === 'income' ? [{ product: 'p1', _sum: { quantity: 100 } }] : [],
          },
        }),
    );
    expect(await dispatchLowStockAlert('t1')).toEqual({ emails: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('emails one row per owner+admin recipient when stock is low', async () => {
    mockGetSettings.mockResolvedValue(FULL_SETTINGS);
    mockWithTenant.mockImplementation(
      async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          movement_inventory_stock_balance: {
            groupBy: async (args: { where: { kind: 'income' | 'expense' } }) => {
              return args.where.kind === 'income'
                ? [
                    { product: 'p1', _sum: { quantity: 10 } },
                    { product: 'p2', _sum: { quantity: 5 } },
                  ]
                : [
                    { product: 'p1', _sum: { quantity: 9 } },
                    { product: 'p2', _sum: { quantity: 5 } },
                  ];
            },
          },
          catalog_inventory_product: {
            findMany: async () => [
              { id: 'p1', name: 'Widget' },
              { id: 'p2', name: 'Gadget' },
            ],
          },
          membership: {
            findMany: async () => [
              { user: { email: 'admin@x.com' } },
              { user: { email: 'owner@x.com' } },
            ],
          },
        }),
    );
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        tenant: {
          findUnique: async () => ({ id: 't1', name: 'Acme', defaultLocale: 'en' }),
        },
      }),
    );

    const result = await dispatchLowStockAlert('t1');
    expect(result).toEqual({ emails: 2 });
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockWithTenant).toHaveBeenCalledWith('t1', expect.any(Function));
    const firstCall = (
      mockSend.mock.calls as unknown as Array<[{ items: Array<{ name: string }> }]>
    )[0]?.[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.items.map((i) => i.name).sort()).toEqual(['Gadget', 'Widget']);
  });
});
