import { expect, test } from '@playwright/test';

test.describe('billing — trial expiry cron — unauthenticated smoke', () => {
  test('POST /api/cron/trial-expiry without bearer returns 401', async ({ request }) => {
    const res = await request.post('/api/cron/trial-expiry');
    expect(res.status()).toBe(401);
  });

  test('POST /api/cron/trial-expiry with wrong bearer returns 401', async ({ request }) => {
    const res = await request.post('/api/cron/trial-expiry', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe.skip(
  'billing — trial expiry cron — authenticated (requires CRON_SECRET fixture)',
  () => {
    test('POST /api/cron/trial-expiry with bearer transitions trialing→active', async () => {
      // TODO: seed tenant with trialEndsAt=past, POST with bearer, assert tenant.status=active + BillingEvent row exists
    });
  },
);
