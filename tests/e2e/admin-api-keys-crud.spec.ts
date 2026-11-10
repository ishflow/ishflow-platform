/**
 * Admin UI — `/admin/api-keys` smoke + (placeholder for) authenticated flow.
 *
 * The repo's Playwright suite currently has no signed-in `storageState`
 * fixture (see `tests/e2e/admin-roles-scopes.spec.ts` for the precedent).
 * That means the full reveal-once dialog → copy → revoke flow can only be
 * exercised in unit/integration tests (see `app/[locale]/(platform)/admin/
 * api-keys/__tests__/`) until a Clerk dev-instance auth fixture lands.
 *
 * The smoke test below mirrors `admin-roles-scopes.spec.ts`: it asserts that
 * an unauthenticated visit redirects to sign-in, which proves the route is
 * mounted and protected. The skipped block documents the full happy-path
 * for the future fixture to fill in.
 */

import { expect, test } from '@playwright/test';

test.describe('/admin/api-keys — smoke', () => {
  test('unauthenticated visit to /en/admin/api-keys redirects to sign-in', async ({ page }) => {
    await page.goto('/en/admin/api-keys');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('unauthenticated visit to /ru/admin/api-keys redirects to sign-in', async ({ page }) => {
    await page.goto('/ru/admin/api-keys');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

// Skipped pending a signed-in storageState fixture. The shape below is what
// the test should look like once the fixture exists — keep it close to the
// real UI selectors so a future contributor can flip `.skip` to `.fixme` and
// fill in the gaps in one pass.
test.describe.skip('/admin/api-keys — owner CRUD (needs signed-in fixture)', () => {
  test('owner creates a key, sees reveal dialog, copies, revokes', async ({ page }) => {
    await page.goto('/en/admin/api-keys');

    // Open the create dialog.
    await page.getByRole('button', { name: /create.*key/i }).click();

    // Fill name + select write scope.
    await page.getByLabel(/name/i).fill('e2e key');
    await page.getByLabel(/write/i).check();
    await page.getByRole('button', { name: /create/i }).click();

    // Reveal-once dialog: the full key must appear exactly once.
    const revealedKey = page.getByTestId('api-key-revealed');
    await expect(revealedKey).toBeVisible();
    await expect(revealedKey).toHaveText(/^1ca_live_[a-f0-9]{32}$/);
    await page.getByRole('button', { name: /copy/i }).click();
    await page.getByRole('button', { name: /done/i }).click();

    // Table row shows the prefix.
    await expect(page.getByText(/^1ca_live_/).first()).toBeVisible();

    // Revoke → row shows revoked badge.
    const revokeBtn = page.getByRole('button', { name: /revoke/i }).first();
    await revokeBtn.click();
    await page.getByRole('button', { name: /confirm/i }).click();
    await expect(page.getByText(/revoked/i).first()).toBeVisible();
  });
});
