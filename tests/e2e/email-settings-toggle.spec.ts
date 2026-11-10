import { expect, test } from '@playwright/test';

/**
 * Email notifications: per-tenant Settings → Notifications tab.
 *
 * TODO: Requires Clerk authenticated test fixtures (admin storageState).
 * Skipped until role-based-ui fixtures land.
 */
test.describe.skip('Email notifications: settings toggles', () => {
  test('admin can toggle invoice-sent off and value persists', async ({ page }) => {
    await page.goto('/en/settings/notifications');
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();

    const invoiceSwitch = page.getByLabel(/invoice sent/i);
    const initial = await invoiceSwitch.isChecked();
    await invoiceSwitch.click();
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/notification settings saved/i)).toBeVisible();

    await page.reload();
    await expect(invoiceSwitch).toBeChecked({ checked: !initial });
  });

  test('admin can change low-stock threshold and value persists', async ({ page }) => {
    await page.goto('/en/settings/notifications');
    const thresholdInput = page.getByLabel(/low stock threshold/i);
    await thresholdInput.fill('12');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/notification settings saved/i)).toBeVisible();

    await page.reload();
    await expect(thresholdInput).toHaveValue('12');
  });
});
