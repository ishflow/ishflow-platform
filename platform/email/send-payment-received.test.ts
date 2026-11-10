import type { Resend } from 'resend';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetResendForTests } from './resend-client';
import { sendPaymentReceivedEmail } from './send-payment-received';

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

describe('sendPaymentReceivedEmail', () => {
  beforeEach(() => resetResendForTests(undefined));
  afterEach(() => resetResendForTests(undefined));

  it('uses English subject by default', async () => {
    const sendFn = vi.fn<(a: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_1' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendPaymentReceivedEmail({
      to: 'c@x.com',
      workspaceName: 'Acme',
      customerName: 'Bob',
      amount: '500.00',
      currency: 'USD',
      receivedAt: '2026-05-13',
    });

    expect(sendFn.mock.calls[0]?.[0]?.subject).toBe('Acme received your payment of 500.00 USD');
  });

  it('uses Turkish subject when locale=tr', async () => {
    const sendFn = vi.fn<(a: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_2' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendPaymentReceivedEmail({
      to: 'c@x.com',
      workspaceName: 'Akme',
      customerName: 'Ali',
      amount: '500',
      currency: 'TRY',
      receivedAt: '2026-05-13',
      locale: 'tr',
    });

    expect(sendFn.mock.calls[0]?.[0]?.subject).toBe('Akme, 500 TRY ödemenizi aldı');
  });

  it('throws on Resend error', async () => {
    resetResendForTests({
      emails: { send: vi.fn(async () => ({ data: null, error: { message: 'rate limit' } })) },
    } as unknown as Resend);

    await expect(
      sendPaymentReceivedEmail({
        to: 'c@x.com',
        workspaceName: 'Acme',
        customerName: 'Bob',
        amount: '1',
        currency: 'USD',
        receivedAt: '2026-05-13',
      }),
    ).rejects.toThrow(/rate limit/);
  });
});
