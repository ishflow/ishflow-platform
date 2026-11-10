import { expect, test } from '@playwright/test';

/**
 * Tabs e2e — see admin-roles-scopes.spec.ts for the auth limitation in
 * this repo: there is no authenticated storageState fixture yet, so the
 * happy-path (3 tabs, switch, close) is covered by the vitest suites
 * (components/app/tabs/*.test.tsx). Replace the `.skip` below once a
 * signed-in fixture lands.
 */

test.describe('tab shell — unauthenticated smoke', () => {
  test('protected dashboard redirects to sign-in', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('protected catalog page redirects to sign-in', async ({ page }) => {
    await page.goto('/en/catalogs/inventory.product');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe.skip('tab shell — authenticated happy path (requires Clerk test fixture)', () => {
  test('opens a tab on sidebar click and focuses it on second click', async ({ page }) => {
    // TODO: implement once tests/e2e/helpers/auth.ts lands a signed-in
    // storageState. Follow spec §7.1 "Opening a sidebar link".
    await page.goto('/en/dashboard');
  });

  test('preserves form state across tab switches', async ({ page }) => {
    // TODO: requires signed-in fixture. Covered by unit + component suites
    // (iframe keep-alive is a browser primitive — we only need an e2e
    // verification that switching display:none siblings preserves input).
    await page.goto('/en/dashboard');
  });
});
