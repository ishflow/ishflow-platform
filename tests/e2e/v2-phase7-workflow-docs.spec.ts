import { expect, test } from '@playwright/test';

/**
 * Phase 7 — 4 workflow-status 1C documents — browser smoke.
 *
 * purchases.payment_request (Заявка на оплату), sales.commercial_offer
 * (Коммерческое предложение), treasury.payment_order (Платёжное
 * поручение), inventory.material_request (Заявка на материалы).
 *
 * All four are workflow-status docs with no register postings.
 */

const SLUGS = ['payment-request', 'commercial-offer', 'payment-order', 'material-request'] as const;
const SYNTHETIC_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('V2 phase 7 — workflow-status docs — UI smoke', () => {
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
