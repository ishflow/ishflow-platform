import { expect, test } from '@playwright/test';

test.describe('billing — monthly/yearly toggle — unauthenticated smoke', () => {
  test('/admin/billing redirects to sign-in', async ({ page }) => {
    await page.goto('/en/admin/billing');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe.skip(
  'billing — monthly/yearly toggle — authenticated (requires Clerk fixture)',
  () => {
    test('toggle monthly → yearly changes card price label', async () => {
      // TODO: sign in, visit /en/admin/billing, click Yearly tab, assert starter card text changes from "$19/mo" to "$190/yr"
    });
    test('click Upgrade with yearly toggle sends interval=year to checkout API', async () => {
      // TODO: intercept POST /api/billing/checkout-session and assert body.interval === 'year'
    });
  },
);
