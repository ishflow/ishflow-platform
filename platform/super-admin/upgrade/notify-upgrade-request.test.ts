import { resetResendForTests } from '@/platform/email/resend-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyUpgradeRequest } from './notify-upgrade-request';

afterEach(() => resetResendForTests(undefined));

describe('notifyUpgradeRequest', () => {
  it('sends to SUPER_ADMIN_NOTIFY_EMAIL and reports ok', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'e1' }, error: null });
    resetResendForTests({ emails: { send } } as never);
    process.env.SUPER_ADMIN_NOTIFY_EMAIL = 'ops-test@ishflow.com';

    const r = await notifyUpgradeRequest({
      companyName: 'Acme',
      contactEmail: 'a@acme.co',
      contactPhone: '+1',
      requestedPlan: 'pro',
      note: null,
    });

    expect(r.ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toMatchObject({ to: 'ops-test@ishflow.com' });
  });

  it('swallows provider errors and returns ok:false', async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    resetResendForTests({ emails: { send } } as never);
    const r = await notifyUpgradeRequest({
      companyName: 'Acme',
      contactEmail: 'a@acme.co',
      contactPhone: '+1',
      requestedPlan: null,
      note: null,
    });
    expect(r.ok).toBe(false);
  });
});
