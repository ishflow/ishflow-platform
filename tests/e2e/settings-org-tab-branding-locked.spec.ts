import { expect, test } from '@playwright/test';

/**
 * Organization tab gates Logo URL + Brand color behind the `customBranding`
 * feature. A free tenant sees both inputs disabled and an upsell alert; a
 * business-plan tenant sees them enabled.
 *
 * TODO: Requires Clerk auth fixtures for at least two tenants (one free,
 * one business). Skipped until those land.
 */
test.describe.skip('Settings — Organization tab branding gate', () => {
  test('free tenant sees disabled logo + brand color with upsell', async ({ page }) => {
    await page.goto('/en/settings/organization');
    await expect(page.getByRole('heading', { name: 'Organization profile' })).toBeVisible();
    await expect(page.getByText('Custom branding is on Business')).toBeVisible();
    await expect(page.getByLabel('Logo')).toBeDisabled();
    await expect(page.getByLabel('Brand color').first()).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Upgrade plan' })).toHaveAttribute(
      'href',
      /\/admin\/billing/,
    );
  });

  test('business tenant sees enabled logo + brand color inputs', async ({ page }) => {
    await page.goto('/en/settings/organization');
    await expect(page.getByText('Custom branding is on Business')).toHaveCount(0);
    await expect(page.getByLabel('Logo')).toBeEnabled();
    await expect(page.getByLabel('Brand color').first()).toBeEnabled();
  });
});
