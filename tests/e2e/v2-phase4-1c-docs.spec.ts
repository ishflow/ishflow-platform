import { expect, test } from '@playwright/test';

/**
 * Phase 4 — 4 cash-flow + production 1C documents — browser smoke.
 *
 * treasury.cash_transfer (Перемещение наличных), sales.refund_payment
 * (Возврат покупателю), purchases.refund_received (Возврат от
 * поставщика), inventory.production_report (Производственный отчёт).
 */

const SLUGS = ['cash-transfer', 'refund-payment', 'refund-received', 'production-report'] as const;
const SYNTHETIC_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('V2 phase 4 — 4 cash-flow + production docs — UI smoke', () => {
  for (const slug of SLUGS) {
    test(`list /v2/documents/${slug} renders (no 500)`, async ({ page }) => {
      const res = await page.goto(`/en/v2/documents/${slug}`, { waitUntil: 'domcontentloaded' });
      const status = res?.status() ?? 0;
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
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
