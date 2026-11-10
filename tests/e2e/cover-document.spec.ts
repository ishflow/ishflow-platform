import { expect, test } from '@playwright/test';

/** See cover-catalog.spec.ts for the auth-fixture gap. */

test.describe('document cover — unauthenticated smoke', () => {
  test('invoice new page redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/en/documents/sales.invoice/new');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe.skip(
  'document cover — authenticated happy path (requires Clerk test fixture)',
  () => {
    test('Geçir ve kapat posts the document and closes the tab', async ({ page }) => {
      // TODO: fills header + one invoice line, clicks the primary cover
      // button, expects POSTED status and the list tab focused.
      await page.goto('/tr/documents/sales.invoice/new');
    });
  },
);
