import { expect, test } from '@playwright/test';

/**
 * Phase 3 — 4 more 1C documents — browser smoke.
 *
 * treasury.expense_report (Авансовый отчёт), sales.service_sale
 * (Реализация услуг), purchases.service_receipt (Поступление услуг),
 * sales.retail_sale (Розничная продажа).
 */

const SLUGS = ['expense-report', 'service-sale', 'service-receipt', 'retail-sale'] as const;
const SYNTHETIC_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('V2 phase 3 — 4 more 1C documents — UI smoke', () => {
  for (const slug of SLUGS) {
    test(`list /v2/documents/${slug} renders (no 500)`, async ({ page }) => {
      const res = await page.goto(`/en/v2/documents/${slug}`, { waitUntil: 'domcontentloaded' });
      const status = res?.status() ?? 0;
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain('internal server error');
    });

    test(`new form /v2/documents/${slug}/new renders (no 500)`, async ({ page }) => {
      const res = await page.goto(`/en/v2/documents/${slug}/new`, {
        waitUntil: 'domcontentloaded',
      });
      const status = res?.status() ?? 0;
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
    });

    test(`detail /v2/documents/${slug}/[id] handles unknown ID (no 500)`, async ({ page }) => {
      const res = await page.goto(`/en/v2/documents/${slug}/${SYNTHETIC_UUID}`, {
        waitUntil: 'domcontentloaded',
      });
      const status = res?.status() ?? 0;
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
    });
  }
});
