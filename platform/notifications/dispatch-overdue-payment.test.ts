import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithBypass = vi.hoisted(() => vi.fn());
const mockWithTenant = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn(async () => ({ id: 'em' })));
const mockGetSettings = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
  withTenant: mockWithTenant,
}));
vi.mock('@/platform/email/send-overdue-payment', () => ({ sendOverduePaymentEmail: mockSend }));
vi.mock('./settings', () => ({ getNotificationSettings: mockGetSettings }));

const { dispatchOverduePayment } = await import('./dispatch-overdue-payment');

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

describe('dispatchOverduePayment', () => {
  it('skips when RESEND_API_KEY missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await dispatchOverduePayment('t1')).toEqual({ emails: 0 });
  });

  it('skips when overduePayment setting is off', async () => {
    mockGetSettings.mockResolvedValue({ ...FULL_SETTINGS, overduePayment: false });
    expect(await dispatchOverduePayment('t1')).toEqual({ emails: 0 });
  });

  it('emails only invoices on the weekly cadence with positive outstanding', async () => {
    mockGetSettings.mockResolvedValue(FULL_SETTINGS);
    const now = new Date('2026-05-13T00:00:00Z');
    // Day 30 → exactly threshold, send
    const dayThirtyAgo = new Date(now);
    dayThirtyAgo.setUTCDate(dayThirtyAgo.getUTCDate() - 30);
    // Day 31 → off-cadence (sinceThreshold=1, %7!=0), skip
    const dayThirtyOneAgo = new Date(now);
    dayThirtyOneAgo.setUTCDate(dayThirtyOneAgo.getUTCDate() - 31);
    // Day 37 → on-cadence, but outstanding=0, skip
    const dayThirtySevenAgo = new Date(now);
    dayThirtySevenAgo.setUTCDate(dayThirtySevenAgo.getUTCDate() - 37);

    mockWithTenant.mockImplementation(
      async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          document_sales_invoice: {
            findMany: async () => [
              { id: 'i1', number: 'INV-1', date: dayThirtyAgo, customer: 'c1' },
              { id: 'i2', number: 'INV-2', date: dayThirtyOneAgo, customer: 'c1' },
              { id: 'i3', number: 'INV-3', date: dayThirtySevenAgo, customer: 'c1' },
            ],
          },
          document_line_sales_invoice_items: {
            findMany: async () => [
              { documentId: 'i1', quantity: 2, price: 100 }, // total 200
              { documentId: 'i2', quantity: 1, price: 50 }, // total 50
              { documentId: 'i3', quantity: 1, price: 200 }, // total 200, fully paid below
            ],
          },
          document_sales_payment_received: {
            findMany: async () => [
              { linkedInvoices: JSON.stringify([{ invoiceId: 'i3', amount: 200 }]) },
            ],
          },
          catalog_sales_customer: {
            findMany: async () => [{ id: 'c1', name: 'Bob', email: 'bob@x.com' }],
          },
        }),
    );
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        tenant: {
          findUnique: async () => ({
            id: 't1',
            name: 'Acme',
            defaultLocale: 'en',
            currency: 'USD',
          }),
        },
      }),
    );

    const result = await dispatchOverduePayment('t1', now);
    expect(result).toEqual({ emails: 1 });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockWithTenant).toHaveBeenCalledWith('t1', expect.any(Function));
    const firstCall = (mockSend.mock.calls as unknown as Array<[Record<string, unknown>]>)[0]?.[0];
    expect(firstCall).toMatchObject({
      to: 'bob@x.com',
      invoiceNumber: 'INV-1',
      daysOverdue: 30,
      amount: '200.00',
    });
  });
});
