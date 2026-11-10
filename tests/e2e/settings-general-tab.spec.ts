import { expect, test } from '@playwright/test';

/**
 * Owner changes display currency on the General tab and the choice
 * persists across refresh. Asserts the tab shell renders, the currency
 * select reflects the new value, and a toast acknowledges the save.
 *
 * TODO: Requires Clerk authenticated test fixture for an owner of a fresh
 * tenant. Skipped until storageState fixtures land (see role-based-ui.spec.ts).
 */
test.describe.skip('Settings — General tab', () => {
  test('owner switches currency USD → EUR and value persists', async ({ page }) => {
    await page.goto('/en/settings/general');
    await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();

    // Currency select shows USD initially (seed default)
    const currencyTrigger = page.getByLabel('Display currency');
    await expect(currencyTrigger).toContainText('USD');
    await currencyTrigger.click();
    await page.getByRole('option', { name: 'EUR' }).click();

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('General settings saved.')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Display currency')).toContainText('EUR');
  });
});
