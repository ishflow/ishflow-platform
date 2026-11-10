import { expect, test } from '@playwright/test';

test.describe('billing — saved view limit — unauthenticated smoke', () => {
  test('reports page (hosts saved view list) redirects to sign-in', async ({ page }) => {
    // SavedViewList is mounted on /reports (see app/[locale]/(platform)/reports/page.tsx).
    // The /reports/saved-views directory has no page.tsx — it's a UI fragment.
    await page.goto('/en/reports');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe.skip('billing — saved view limit — authenticated (requires Clerk fixture)', () => {
  test('free tenant at savedViews=3 cannot create 4th — gets 402', async () => {
    // TODO: sign in as free tenant at limit, attempt to create a 4th saved view, assert HTTP 402 response with feature_locked / plan_limit code
  });
});
