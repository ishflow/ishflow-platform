import { expect, test } from '@playwright/test';

const pages = [
  { name: 'home-light', path: '/ru', theme: 'light' as const },
  { name: 'home-dark', path: '/ru', theme: 'dark' as const },
  { name: 'pricing-light', path: '/ru/pricing', theme: 'light' as const },
];

for (const p of pages) {
  test(`screenshot ${p.name}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: p.theme });
    await page.goto(p.path);
    await page.waitForLoadState('networkidle');
    // Disable animations to stabilize screenshots
    await page.addStyleTag({
      content:
        '*, *::before, *::after { animation: none !important; transition: none !important; }',
    });
    await expect(page).toHaveScreenshot({ fullPage: true, maxDiffPixelRatio: 0.02 });
  });
}
