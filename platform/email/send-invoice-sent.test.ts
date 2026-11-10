import type { Resend } from 'resend';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetResendForTests } from './resend-client';
import { sendInvoiceSentEmail } from './send-invoice-sent';

interface SendResult {
  data: { id: string } | null;
  error: { message: string } | null;
}

interface SendArgs {
  from: string;
  to: string;
  subject: string;
  html: string;
}

describe('sendInvoiceSentEmail', () => {
  beforeEach(() => resetResendForTests(undefined));
  afterEach(() => resetResendForTests(undefined));

  it('uses English subject by default with invoice number', async () => {
    const sendFn = vi.fn<(a: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_1' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    const result = await sendInvoiceSentEmail({
      to: 'cust@x.com',
      workspaceName: 'Acme',
      customerName: 'Bob',
      invoiceNumber: 'INV-100',
      totalAmount: '1,500.00',
      currency: 'USD',
      invoiceUrl: 'https://example.com/inv/100',
    });

    expect(result.id).toBe('em_1');
    const payload = sendFn.mock.calls[0]?.[0];
    expect(payload?.subject).toBe('Invoice INV-100 from Acme');
    expect(payload?.html).toContain('1,500.00');
    expect(payload?.html).toContain('https://example.com/inv/100');
  });

  it('uses Russian subject when locale=ru', async () => {
    const sendFn = vi.fn<(a: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_2' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendInvoiceSentEmail({
      to: 'cust@x.com',
      workspaceName: 'Акме',
      customerName: 'Иван',
      invoiceNumber: 'INV-100',
      totalAmount: '1500',
      currency: 'RUB',
      invoiceUrl: 'https://example.com',
      locale: 'ru',
    });

    expect(sendFn.mock.calls[0]?.[0]?.subject).toBe('Счёт INV-100 от Акме');
  });

  it('escapes HTML in customer name', async () => {
    const sendFn = vi.fn<(a: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_3' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendInvoiceSentEmail({
      to: 'cust@x.com',
      workspaceName: 'Acme',
      customerName: '<script>alert(1)</script>',
      invoiceNumber: 'INV-1',
      totalAmount: '1',
      currency: 'USD',
      invoiceUrl: 'https://example.com',
    });

    const html = sendFn.mock.calls[0]?.[0]?.html ?? '';
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('throws on Resend error', async () => {
    resetResendForTests({
      emails: { send: vi.fn(async () => ({ data: null, error: { message: 'fail' } })) },
    } as unknown as Resend);

    await expect(
      sendInvoiceSentEmail({
        to: 'cust@x.com',
        workspaceName: 'Acme',
        customerName: 'Bob',
        invoiceNumber: 'INV-1',
        totalAmount: '1',
        currency: 'USD',
        invoiceUrl: 'https://example.com',
      }),
    ).rejects.toThrow(/fail/);
  });
});
