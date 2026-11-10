import { expect, test } from '@playwright/test';

/**
 * After the IA consolidation, "Settings" is a top-level sidebar entry
 * (not nested under Reports). Clicking it lands the user on
 * /settings/general by way of the redirect from /settings.
 *
 * TODO: Requires an authenticated tenant fixture for at least admin or
 * owner so the entry is rendered (sidebar gates on admin.organization:edit).
 */
test.describe.skip('Sidebar — Settings entry', () => {
  test('Settings appears as standalone bottom nav and routes to /settings/general', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');

    // Settings link exists outside the Reports group
    const reportsGroup = page.getByRole('group').filter({ hasText: 'Reports' });
    await expect(reportsGroup.getByRole('link', { name: 'Settings' })).toHaveCount(0);

    const settingsLink = page.getByRole('link', { name: 'Settings' });
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();

    await expect(page).toHaveURL(/\/settings\/general$/);
    await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  });
});
