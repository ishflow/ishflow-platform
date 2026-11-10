import { expect, test } from '@playwright/test';

/**
 * Owner deletes their organization by typing the exact org name and
 * confirming. Asserts the Delete button is disabled until the typed name
 * matches, the success toast surfaces, and the tenant row is soft-deleted
 * (Tenant.deletedAt is now set; RLS hides every subsequent read).
 *
 * TODO: Requires an owner auth fixture AND a DB inspection helper to assert
 * the deletedAt column after the action. Skipped until both land.
 */
test.describe.skip('Settings — Danger zone delete', () => {
  test('owner deletes org via name confirmation', async ({ page }) => {
    await page.goto('/en/settings/danger');
    await expect(page.getByRole('heading', { name: 'Danger zone' })).toBeVisible();

    const deleteCard = page.getByRole('heading', { name: 'Delete organization' });
    await expect(deleteCard).toBeVisible();

    // Open the delete dialog
    await page.getByRole('button', { name: 'Delete organization' }).first().click();

    const confirmInput = page.getByLabel(/Type .* to confirm/);
    const confirmBtn = page.getByRole('button', { name: 'Delete organization' }).last();
    await expect(confirmBtn).toBeDisabled();

    // Mismatch keeps the button disabled
    await confirmInput.fill('wrong name');
    await expect(confirmBtn).toBeDisabled();

    // Exact match enables; click then assert toast + redirect
    await confirmInput.fill('Acme Org');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();
    await expect(page.getByText('Organization queued for deletion.')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard|\/sign-in/);
  });
});
