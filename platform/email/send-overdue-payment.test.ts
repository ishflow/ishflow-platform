import type { Resend } from 'resend';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetResendForTests } from './resend-client';
import { sendOverduePaymentEmail } from './send-overdue-payment';

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

describe('sendOverduePaymentEmail', () => {
  beforeEach(() => resetResendForTests(undefined));
  afterEach(() => resetResendForTests(undefined));

  it('uses English subject by default with days', async () => {
    const sendFn = vi.fn<(a: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_1' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendOverduePaymentEmail({
      to: 'c@x.com',
      workspaceName: 'Acme',
      customerName: 'Bob',
      invoiceNumber: 'INV-9',
      daysOverdue: 12,
      amount: '500.00',
      currency: 'USD',
      invoiceUrl: 'https://example.com/inv/9',
    });

    const args = sendFn.mock.calls[0]?.[0];
    expect(args?.subject).toBe('Reminder: invoice INV-9 is 12 days overdue');
    expect(args?.html).toContain('12 days overdue');
  });

  it('uses Russian subject when locale=ru', async () => {
    const sendFn = vi.fn<(a: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_2' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendOverduePaymentEmail({
      to: 'c@x.com',
      workspaceName: 'Акме',
      customerName: 'Иван',
      invoiceNumber: 'INV-9',
      daysOverdue: 12,
      amount: '500',
      currency: 'RUB',
      invoiceUrl: 'https://example.com',
      locale: 'ru',
    });

    expect(sendFn.mock.calls[0]?.[0]?.subject).toBe('Напоминание: счёт INV-9 просрочен на 12 дн.');
  });

  it('throws on Resend error', async () => {
    resetResendForTests({
      emails: { send: vi.fn(async () => ({ data: null, error: { message: 'fail' } })) },
    } as unknown as Resend);

    await expect(
      sendOverduePaymentEmail({
        to: 'c@x.com',
        workspaceName: 'Acme',
        customerName: 'Bob',
        invoiceNumber: 'INV-9',
        daysOverdue: 12,
        amount: '500',
        currency: 'USD',
        invoiceUrl: 'https://example.com',
      }),
    ).rejects.toThrow(/fail/);
  });
});
