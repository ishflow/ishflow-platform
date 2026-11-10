import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithBypass = vi.hoisted(() => vi.fn());
const mockWithTenant = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn(async () => ({ id: 'em' })));
const mockGetSettings = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
  withTenant: mockWithTenant,
}));
vi.mock('@/platform/email/send-payment-received', () => ({ sendPaymentReceivedEmail: mockSend }));
vi.mock('./settings', () => ({ getNotificationSettings: mockGetSettings }));

const { dispatchPaymentReceived } = await import('./dispatch-payment-received');

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

describe('dispatchPaymentReceived', () => {
  it('skips when RESEND_API_KEY missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    await dispatchPaymentReceived('t1', 'pay1');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips when paymentReceived setting is off', async () => {
    mockGetSettings.mockResolvedValue({ ...FULL_SETTINGS, paymentReceived: false });
    await dispatchPaymentReceived('t1', 'pay1');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends email when wired', async () => {
    mockGetSettings.mockResolvedValue(FULL_SETTINGS);
    mockWithTenant.mockImplementation(
      async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          document_sales_payment_received: {
            findUnique: async () => ({
              id: 'pay1',
              date: new Date('2026-05-13T10:00:00Z'),
              customer: 'c1',
              amount: 250,
            }),
          },
          catalog_sales_customer: {
            findUnique: async () => ({ id: 'c1', name: 'Bob', email: 'bob@x.com' }),
          },
        }),
    );
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        tenant: {
          findUnique: async () => ({
            id: 't1',
            name: 'Acme',
            defaultLocale: 'tr',
            currency: 'TRY',
          }),
        },
      }),
    );

    await dispatchPaymentReceived('t1', 'pay1');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'bob@x.com',
        amount: '250.00',
        currency: 'TRY',
        receivedAt: '2026-05-13',
        locale: 'tr',
      }),
    );
    expect(mockWithTenant).toHaveBeenCalledWith('t1', expect.any(Function));
  });
});
