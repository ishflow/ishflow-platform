import { expect, test } from '@playwright/test';

/**
 * Pricing flow e2e — Task 17 of the 1C-style pricing system plan.
 *
 * The full canonical flow (post a price_setting → see register row → invoice
 * auto-fills price from customer.defaultPriceType) requires a signed-in
 * storageState fixture, which this repo does not yet have (see
 * tests/e2e/tabs.spec.ts and admin-roles-scopes.spec.ts for the same pattern).
 *
 * The pricing engine is exercised by:
 *   - configs/inventory/documents/price-setting.test.ts (3 integration tests:
 *     post → register row, reject dynamic, unpost soft-delete)
 *   - platform/engine/pricing.test.ts (21 tests: 4-layer resolver, cycle
 *     guard, register lookup, dynamic recursion)
 *   - platform/engine/information-register-query.test.ts (5 tests: slice +
 *     soft-delete + asOf semantics)
 *
 * Replace the `.skip` block below once a signed-in Clerk fixture lands.
 */

test.describe('pricing flow — unauthenticated smoke', () => {
  test('price_setting/new redirects to sign-in', async ({ page }) => {
    await page.goto('/en/documents/inventory.price_setting/new');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('register viewer for inventory.product_price redirects to sign-in', async ({ page }) => {
    await page.goto('/en/registers/inventory.product_price');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe.skip('pricing flow — authenticated happy path (requires Clerk test fixture)', () => {
  test('post price_setting → register row visible → invoice auto-fills price', async ({ page }) => {
    // TODO: implement once tests/e2e/helpers/auth.ts lands a signed-in
    // storageState. Steps:
    //   1. Visit /ru/documents/inventory.price_setting/new.
    //   2. Pick a static price type ("Розничная"); the picker should hide
    //      dynamic types thanks to referenceFilter:'staticOnly'.
    //   3. Add one product line with a price; save & post.
    //   4. Visit /ru/registers/inventory.product_price; the new row appears
    //      in the matrix at today's slice.
    //   5. Visit /ru/documents/sales.invoice/new and pick a customer that
    //      has defaultPriceType set; the header `priceType` auto-fills from
    //      the customer (entity-form watcher in platform/ui/entity-form.tsx).
    //   6. Add a product line; the line price auto-fills from the matrix
    //      via resolveLinePrice → Layer 2 → register at invoice.date.
    await page.goto('/ru/documents/inventory.price_setting/new');
  });
});
