import { expect, test } from '@playwright/test';

/**
 * Smoke test guarding the "404 on save" class of bug. An authenticated e2e
 * fixture does not exist in this repo (see admin-roles-scopes.spec.ts),
 * so instead of clicking Kaydet we verify the create routes themselves
 * resolve — unauthenticated visits must redirect to /sign-in, not return
 * 404. A missing `import '@/configs'` or missing entry in the barrel
 * produces a 404 at route resolution time via `notFound()` calls in
 * `catalogs/[entity]/new/page.tsx` and `documents/[entity]/new/page.tsx`.
 *
 * The authenticated Kaydet-click test is covered at the unit level via
 * platform/engine test suites until the e2e auth fixture lands.
 */
test.describe('Catalog/document create routes resolve (no 404)', () => {
  const routes = [
    '/tr/catalogs/sales.customer/new',
    '/tr/catalogs/purchases.supplier/new',
    '/tr/catalogs/inventory.product/new',
    '/tr/catalogs/inventory.warehouse/new',
    '/tr/documents/sales.invoice/new',
    '/tr/documents/purchases.invoice/new',
  ];

  for (const route of routes) {
    test(`${route} redirects to sign-in, not 404`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/sign-in/);
      await expect(page.getByText('This page could not be found')).toHaveCount(0);
    });
  }
});
