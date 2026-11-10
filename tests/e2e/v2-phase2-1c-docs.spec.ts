import { expect, test } from '@playwright/test';

/**
 * Phase 2 — 4 additional 1C documents — browser smoke.
 *
 * sales.order (Заказ покупателя), purchases.order (Заказ поставщику),
 * sales.invoice_for_payment (Счёт на оплату), treasury.debt_adjustment
 * (Корректировка долга). Each gets a list route + a new-form route.
 * Detail (`[id]`) route returns 404 on a synthetic UUID — that's expected
 * (proves the route compiled + auth ran).
 */

const SLUGS = ['sales-order', 'invoice-for-payment', 'purchase-order', 'debt-adjustment'] as const;

const SYNTHETIC_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('V2 phase 2 — 4 new 1C documents — UI smoke', () => {
  test.beforeEach(({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const t = msg.text();
        if (!t.includes('Clerk') && !t.includes('Hydration') && !t.includes('hydrat')) {
          // eslint-disable-next-line no-console
          console.warn('[browser console error]', t);
        }
      }
    });
  });

  for (const slug of SLUGS) {
    test(`list /v2/documents/${slug} renders or redirects (no 500)`, async ({ page }) => {
      const res = await page.goto(`/en/v2/documents/${slug}`, { waitUntil: 'domcontentloaded' });
      const status = res?.status() ?? 0;
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain('internal server error');
      const errorBoundary = await page
        .locator('text=Application error: a server-side exception has occurred')
        .count();
      expect(errorBoundary).toBe(0);
    });

    test(`new form /v2/documents/${slug}/new renders or redirects (no 500)`, async ({ page }) => {
      const res = await page.goto(`/en/v2/documents/${slug}/new`, {
        waitUntil: 'domcontentloaded',
      });
      const status = res?.status() ?? 0;
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain('internal server error');
    });

    test(`detail /v2/documents/${slug}/[id] handles unknown ID without 500`, async ({ page }) => {
      const res = await page.goto(`/en/v2/documents/${slug}/${SYNTHETIC_UUID}`, {
        waitUntil: 'domcontentloaded',
      });
      const status = res?.status() ?? 0;
      // 200 (empty state), 404 (not-found page), 302/307 (auth redirect) — all acceptable.
      // Forbidden: 500/502/503/504.
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
    });
  }
});
