import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithBypass = vi.hoisted(() => vi.fn());
const mockWithTenant = vi.hoisted(() => vi.fn());
const mockSendInvoice = vi.hoisted(() => vi.fn(async () => ({ id: 'em_invoice' })));
const mockGetSettings = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
  withTenant: mockWithTenant,
}));
vi.mock('@/platform/email/send-invoice-sent', () => ({ sendInvoiceSentEmail: mockSendInvoice }));
vi.mock('./settings', () => ({ getNotificationSettings: mockGetSettings }));

const { dispatchInvoiceSent } = await import('./dispatch-invoice-sent');

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
  mockSendInvoice.mockClear();
  mockGetSettings.mockReset();
  vi.stubEnv('RESEND_API_KEY', 'test_key');
});

afterEach(() => {
  vi.stubEnv('RESEND_API_KEY', '');
});

function tenantOnly(tenant: {
  name: string;
  defaultLocale: string;
  currency: string;
}): (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown> {
  return async (fn) =>
    fn({
      tenant: {
        findUnique: async () => ({
          id: 't1',
          ...tenant,
        }),
      },
    });
}

describe('dispatchInvoiceSent', () => {
  it('skips when RESEND_API_KEY is unset', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    await dispatchInvoiceSent('t1', 'inv1');
    expect(mockSendInvoice).not.toHaveBeenCalled();
  });

  it('skips when invoiceSent setting is off', async () => {
    mockGetSettings.mockResolvedValue({ ...FULL_SETTINGS, invoiceSent: false });
    await dispatchInvoiceSent('t1', 'inv1');
    expect(mockSendInvoice).not.toHaveBeenCalled();
  });

  it('skips when customer has no email', async () => {
    mockGetSettings.mockResolvedValue(FULL_SETTINGS);
    mockWithTenant.mockImplementation(
      async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          document_sales_invoice: {
            findUnique: async () => ({ id: 'inv1', number: 'INV-1', customer: 'c1' }),
          },
          document_line_sales_invoice_items: {
            findMany: async () => [{ quantity: 2, price: 50 }],
          },
          catalog_sales_customer: {
            findUnique: async () => ({ id: 'c1', name: 'Bob', email: null }),
          },
        }),
    );
    mockWithBypass.mockImplementation(
      tenantOnly({ name: 'Acme', defaultLocale: 'en', currency: 'USD' }),
    );

    await dispatchInvoiceSent('t1', 'inv1');
    expect(mockSendInvoice).not.toHaveBeenCalled();
  });

  it('passes tenantId to withTenant for RLS scoping', async () => {
    mockGetSettings.mockResolvedValue(FULL_SETTINGS);
    mockWithTenant.mockImplementation(
      async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          document_sales_invoice: {
            findUnique: async () => null, // not found — bail before customer lookup
          },
          document_line_sales_invoice_items: { findMany: async () => [] },
          catalog_sales_customer: { findUnique: async () => null },
        }),
    );

    await dispatchInvoiceSent('t1', 'inv1');
    expect(mockWithTenant).toHaveBeenCalledWith('t1', expect.any(Function));
    expect(mockSendInvoice).not.toHaveBeenCalled();
  });

  it('sends email with computed total when everything is wired', async () => {
    mockGetSettings.mockResolvedValue(FULL_SETTINGS);
    mockWithTenant.mockImplementation(
      async (_tenantId: string, fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          document_sales_invoice: {
            findUnique: async () => ({ id: 'inv1', number: 'INV-1', customer: 'c1' }),
          },
          document_line_sales_invoice_items: {
            findMany: async () => [
              { quantity: 2, price: 50 },
              { quantity: 1, price: 100 },
            ],
          },
          catalog_sales_customer: {
            findUnique: async () => ({ id: 'c1', name: 'Bob', email: 'bob@x.com' }),
          },
        }),
    );
    mockWithBypass.mockImplementation(
      tenantOnly({ name: 'Acme', defaultLocale: 'en', currency: 'USD' }),
    );

    await dispatchInvoiceSent('t1', 'inv1');
    expect(mockSendInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'bob@x.com',
        workspaceName: 'Acme',
        customerName: 'Bob',
        invoiceNumber: 'INV-1',
        totalAmount: '200.00',
        currency: 'USD',
        locale: 'en',
      }),
    );
  });
});
