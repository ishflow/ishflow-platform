/**
 * Admin UI — `/admin/import` access-control smoke.
 *
 * The repo's Playwright suite has no signed-in `storageState` fixture yet
 * (see `tests/e2e/role-based-ui.spec.ts` and `admin-api-keys-crud.spec.ts`
 * for the precedent). Full happy-path coverage of the CSV/XLSX import
 * wizard lives in unit/integration tests under
 * `platform/import/__tests__/` and the admin page's own `__tests__/`.
 *
 * This smoke test asserts that an unauthenticated visit to
 * `/en/admin/import` is gated by the Clerk middleware — proving the route
 * is mounted and protected without crashing the server.
 */

import { expect, test } from '@playwright/test';

test.describe('/admin/import — smoke', () => {
  test('unauthenticated visit to /en/admin/import redirects to sign-in', async ({ page }) => {
    const response = await page.goto('/en/admin/import');
    // Clerk middleware should bounce the visitor off the protected page.
    expect(page.url()).not.toContain('/admin/import');
    await expect(page).toHaveURL(/\/sign-in/);
    // And the route itself must not have 5xx'd on the way out.
    const status = response?.status() ?? 0;
    expect(status, `unexpected status ${status}`).toBeLessThan(500);
  });

  test('unauthenticated visit to /ru/admin/import redirects to sign-in', async ({ page }) => {
    const response = await page.goto('/ru/admin/import');
    expect(page.url()).not.toContain('/admin/import');
    await expect(page).toHaveURL(/\/sign-in/);
    const status = response?.status() ?? 0;
    expect(status, `unexpected status ${status}`).toBeLessThan(500);
  });
});
