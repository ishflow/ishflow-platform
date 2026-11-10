import { expect, test } from '@playwright/test';

/**
 * Sprint 16 smoke tests for the RBAC admin surface.
 *
 * These cover the routes that an unauthenticated visitor hits — the
 * current e2e fixture has no authenticated-user storageState, so the
 * authenticated happy-path (admin creates a custom role with a scope,
 * assigns to a user, user sees a restricted list) is covered by the
 * integration / unit suites (platform/engine/scopes.test.ts,
 * platform/engine/crud.test.ts, platform/auth/current-context.test.ts)
 * until the e2e auth fixture lands.
 */

test.describe('Admin RBAC routes', () => {
  test('unauthenticated visit to /en/admin/roles redirects to sign-in', async ({ page }) => {
    await page.goto('/en/admin/roles');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('unauthenticated visit to /en/admin/members redirects to sign-in', async ({ page }) => {
    await page.goto('/en/admin/members');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('unauthenticated visit to /en/admin/audit redirects to sign-in', async ({ page }) => {
    await page.goto('/en/admin/audit');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
