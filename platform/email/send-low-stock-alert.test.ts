import type { Resend } from 'resend';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetResendForTests } from './resend-client';
import { sendLowStockAlertEmail } from './send-low-stock-alert';

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

describe('sendLowStockAlertEmail', () => {
  beforeEach(() => resetResendForTests(undefined));
  afterEach(() => resetResendForTests(undefined));

  it('uses English subject for one product', async () => {
    const sendFn = vi.fn<(a: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_1' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendLowStockAlertEmail({
      to: 'admin@x.com',
      workspaceName: 'Acme',
      items: [{ name: 'Widget', onHand: 2, threshold: 5 }],
      dashboardUrl: 'https://example.com/dashboard',
    });

    const args = sendFn.mock.calls[0]?.[0];
    expect(args?.subject).toBe('1 product below threshold in Acme');
    expect(args?.html).toContain('Widget');
    expect(args?.html).toContain('https://example.com/dashboard');
  });

  it('pluralizes for multiple products', async () => {
    const sendFn = vi.fn<(a: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_2' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendLowStockAlertEmail({
      to: 'admin@x.com',
      workspaceName: 'Acme',
      items: [
        { name: 'A', onHand: 1, threshold: 5 },
        { name: 'B', onHand: 0, threshold: 5 },
      ],
      dashboardUrl: 'https://example.com',
    });

    expect(sendFn.mock.calls[0]?.[0]?.subject).toBe('2 products below threshold in Acme');
  });

  it('uses Russian subject when locale=ru', async () => {
    const sendFn = vi.fn<(a: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_3' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendLowStockAlertEmail({
      to: 'admin@x.com',
      workspaceName: 'Акме',
      items: [{ name: 'A', onHand: 0, threshold: 5 }],
      dashboardUrl: 'https://example.com',
      locale: 'ru',
    });

    expect(sendFn.mock.calls[0]?.[0]?.subject).toBe('1 товар ниже порога в Акме');
  });

  it('throws on Resend error', async () => {
    resetResendForTests({
      emails: { send: vi.fn(async () => ({ data: null, error: { message: 'fail' } })) },
    } as unknown as Resend);

    await expect(
      sendLowStockAlertEmail({
        to: 'admin@x.com',
        workspaceName: 'Acme',
        items: [{ name: 'A', onHand: 0, threshold: 5 }],
        dashboardUrl: 'https://example.com',
      }),
    ).rejects.toThrow(/fail/);
  });
});
