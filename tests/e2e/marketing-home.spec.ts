import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('marketing home', () => {
  test('renders new design sections and primary CTA navigates', async ({ page }) => {
    await page.goto('/ru');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // hero CTA
    const primary = page.getByRole('link', { name: /Начать бесплатно/i }).first();
    await expect(primary).toBeVisible();
    // features grid heading
    await expect(page.locator('h2', { hasText: /1С/i }).first()).toBeVisible();
    // FAQ accordion can expand
    const firstQ = page.getByRole('button', { name: /ishflow/i }).first();
    await firstQ.click();
    // navigate via primary CTA
    await primary.click();
    await expect(page).toHaveURL(/sign-up/);
  });

  test('dark mode toggle round-trips', async ({ page }) => {
    await page.goto('/ru');
    const html = page.locator('html');
    const before = await html.getAttribute('class');
    await page
      .getByRole('button', { name: /Тема|Theme/i })
      .first()
      .click();
    const after = await html.getAttribute('class');
    expect(after).not.toBe(before);
  });
});

test('home has no critical or serious a11y violations', async ({ page }) => {
  await page.goto('/ru');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
