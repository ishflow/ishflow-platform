import { expect, test } from '@playwright/test';

/** See cover-catalog.spec.ts for the auth-fixture gap. */

test.describe('dirty-close — unauthenticated smoke', () => {
  test('edit route redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/tr/catalogs/inventory.product/new');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe.skip('dirty-close — authenticated happy path (requires Clerk test fixture)', () => {
  test('tab × on a dirty tab opens the AlertDialog and cancel keeps the tab', async ({ page }) => {
    // TODO: starts editing, clicks tab ×, expects alertdialog; cancel
    // keeps the tab open.
    await page.goto('/tr/catalogs/inventory.product/new');
  });
});
