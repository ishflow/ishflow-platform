import { expect, test } from '@playwright/test';

test.describe('billing — period-close feature gate — unauthenticated smoke', () => {
  test('/admin/period-close redirects to sign-in', async ({ page }) => {
    await page.goto('/en/admin/period-close');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe.skip(
  'billing — period-close feature gate — authenticated (requires Clerk fixture)',
  () => {
    test('free tenant sees UpsellCard on /admin/period-close', async () => {
      // TODO: sign in as free-plan tenant, visit /en/admin/period-close, assert UpsellCard text "Period close" is visible
    });
    test('pro tenant sees normal period-close UI', async () => {
      // TODO: sign in as pro-plan tenant, visit /en/admin/period-close, assert form is rendered (no upsell)
    });
  },
);
