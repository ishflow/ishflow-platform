import type { Resend } from 'resend';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetResendForTests } from './resend-client';
import { sendTrialEndingEmail } from './send-trial-ending';

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

function makeFakeResend(send: () => Promise<SendResult> | SendResult): Resend {
  return {
    emails: {
      send: vi.fn(async () => send()),
    },
  } as unknown as Resend;
}

describe('sendTrialEndingEmail', () => {
  beforeEach(() => {
    resetResendForTests(undefined);
  });

  afterEach(() => {
    resetResendForTests(undefined);
  });

  it('defaults to English locale and includes days-left in subject', async () => {
    const sendFn = vi.fn<(args: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_1' },
      error: null,
    }));
    resetResendForTests({
      emails: { send: sendFn },
    } as unknown as Resend);

    const result = await sendTrialEndingEmail({
      to: 'user@example.com',
      workspaceName: 'Acme',
      daysLeft: 3,
      upgradeUrl: 'https://example.com/billing',
    });

    expect(result).toEqual({ id: 'em_1' });
    expect(sendFn).toHaveBeenCalledTimes(1);
    const payload = sendFn.mock.calls[0]?.[0];
    expect(payload).toBeDefined();
    expect(payload?.subject).toBe('Your Acme trial ends in 3 days');
    expect(payload?.to).toBe('user@example.com');
    expect(payload?.html).toContain('https://example.com/billing');
  });

  it('uses Russian subject when locale=ru', async () => {
    const sendFn = vi.fn<(args: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_2' },
      error: null,
    }));
    resetResendForTests({
      emails: { send: sendFn },
    } as unknown as Resend);

    await sendTrialEndingEmail({
      to: 'user@example.com',
      workspaceName: 'Acme',
      daysLeft: 5,
      upgradeUrl: 'https://example.com/billing',
      locale: 'ru',
    });

    const payload = sendFn.mock.calls[0]?.[0];
    expect(payload?.subject).toBe('Пробный период Acme заканчивается через 5 дней');
  });

  it('escapes the workspace name in the HTML body (finding B2)', async () => {
    const sendFn = vi.fn<(args: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_3' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendTrialEndingEmail({
      to: 'user@example.com',
      workspaceName: '<script>alert(1)</script>',
      daysLeft: 3,
      upgradeUrl: 'https://example.com/billing',
    });

    const payload = sendFn.mock.calls[0]?.[0];
    expect(payload?.html).not.toContain('<script>');
    expect(payload?.html).toContain('&lt;script&gt;');
  });

  it('throws when Resend returns an error', async () => {
    resetResendForTests(makeFakeResend(() => ({ data: null, error: { message: 'rate limited' } })));

    await expect(
      sendTrialEndingEmail({
        to: 'user@example.com',
        workspaceName: 'Acme',
        daysLeft: 3,
        upgradeUrl: 'https://example.com/billing',
      }),
    ).rejects.toThrow(/rate limited/);
  });

  it('throws when Resend returns no data and no error', async () => {
    resetResendForTests(makeFakeResend(() => ({ data: null, error: null })));

    await expect(
      sendTrialEndingEmail({
        to: 'user@example.com',
        workspaceName: 'Acme',
        daysLeft: 3,
        upgradeUrl: 'https://example.com/billing',
      }),
    ).rejects.toThrow(/no data/);
  });
});
