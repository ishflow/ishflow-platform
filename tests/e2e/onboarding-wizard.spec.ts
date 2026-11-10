import { expect, test } from '@playwright/test';

// Skipped until the Clerk-authenticated Playwright fixture lands (parity
// with tests/e2e/role-based-ui.spec.ts — see memory observation 12438).
// When the fixture is available, flip `test.skip` to `test` and run with
// `pnpm test:e2e`.
test.skip('onboarding wizard: welcome → start fresh → checklist visible → dismiss', async ({
  page,
}) => {
  await page.goto('/en/dashboard');

  // Welcome dialog appears for a tenant with completedCount=0 + demoLoaded=false.
  await expect(page.getByText('Welcome to ishflow')).toBeVisible();

  await page.getByRole('button', { name: 'Start from scratch' }).click();
  await expect(page.getByText('Welcome to ishflow')).not.toBeVisible();

  // Setup checklist is pinned above the widget grid.
  await expect(page.getByText('Get set up')).toBeVisible();
  await expect(page.getByText('0 of 5 done')).toBeVisible();
  await expect(page.getByText('Add your first customer')).toBeVisible();

  // Dismiss removes the widget; reload confirms persistence.
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByText('Get set up')).not.toBeVisible();

  await page.reload();
  await expect(page.getByText('Get set up')).not.toBeVisible();
  await expect(page.getByText('Welcome to ishflow')).not.toBeVisible();
});
