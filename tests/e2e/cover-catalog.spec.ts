import { expect, test } from '@playwright/test';

/**
 * Cover / catalog save-flow e2e. Blocked on the same auth-fixture gap
 * as tests/e2e/admin-roles-scopes.spec.ts. Vitest component tests
 * (components/app/entity-cover.test.tsx) cover button wiring and
 * disabled-while-pending behavior.
 */

test.describe('catalog cover — unauthenticated smoke', () => {
  test('product new page redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/en/catalogs/inventory.product/new');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe.skip('catalog cover — authenticated happy path (requires Clerk test fixture)', () => {
  test('Yaz ve kapat closes tab and focuses list', async ({ page }) => {
    // TODO: implement once auth fixture lands. Fills required fields,
    // clicks the primary cover button, expects the current tab to close
    // and the list tab to be focused (spec §7.2).
    await page.goto('/tr/catalogs/inventory.product/new');
  });
});
