import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('marketing pricing', () => {
  test('billing toggle flips prices', async ({ page }) => {
    await page.goto('/ru/pricing');
    // wait for cards to render
    await expect(page.getByText(/Pro/).first()).toBeVisible();
    // capture pro price before
    const monthlyText = await page.locator('text=/[0-9]+\\s?[0-9]+\\s*₽/').first().innerText();
    // click yearly tab
    await page.getByRole('tab', { name: /Годовая|Yearly|Yıllık|−20%/ }).click();
    // capture pro price after
    await expect(page.locator('text=/[0-9]+\\s?[0-9]+\\s*₽/').first()).toBeVisible();
    const yearlyText = await page.locator('text=/[0-9]+\\s?[0-9]+\\s*₽/').first().innerText();
    expect(yearlyText).not.toBe(monthlyText);
  });

  test('comparison table renders 4 tier columns', async ({ page }) => {
    await page.goto('/ru/pricing');
    // table header has "Возможности" + 4 tier names
    await expect(page.getByText(/Возможности/).first()).toBeVisible();
    await expect(page.getByText(/Free/).first()).toBeVisible();
    await expect(page.getByText(/Starter/).first()).toBeVisible();
    await expect(page.getByText(/Pro/).first()).toBeVisible();
    await expect(page.getByText(/Business/).first()).toBeVisible();
  });
});

test('pricing has no critical or serious a11y violations', async ({ page }) => {
  await page.goto('/ru/pricing');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
