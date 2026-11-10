import type { Resend } from 'resend';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetResendForTests } from './resend-client';
import { sendDowngradeBlockedEmail } from './send-downgrade-blocked';

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

describe('sendDowngradeBlockedEmail', () => {
  beforeEach(() => resetResendForTests(undefined));
  afterEach(() => resetResendForTests(undefined));

  it('escapes the workspace name in the HTML body (finding B2)', async () => {
    const sendFn = vi.fn<(args: SendArgs) => Promise<SendResult>>(async () => ({
      data: { id: 'em_1' },
      error: null,
    }));
    resetResendForTests({ emails: { send: sendFn } } as unknown as Resend);

    await sendDowngradeBlockedEmail({
      to: 'user@example.com',
      workspaceName: '<img src=x onerror=alert(1)>',
      newPlan: 'starter',
      kind: 'members',
      current: 12,
      allowed: 3,
      billingUrl: 'https://example.com/billing',
    });

    const payload = sendFn.mock.calls[0]?.[0];
    expect(payload?.html).not.toContain('<img src=x');
    expect(payload?.html).toContain('&lt;img');
  });
});
