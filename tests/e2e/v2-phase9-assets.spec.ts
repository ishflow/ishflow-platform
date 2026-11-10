import { expect, test } from '@playwright/test';

/**
 * Phase 9 — fixed assets module — browser smoke.
 *
 * NEW module `assets`. assets.fixed_asset (catalog),
 * assets.receipt (Поступление ОС), assets.commissioning
 * (Принятие к учёту ОС), assets.disposal (Списание ОС).
 */

const DOC_SLUGS = ['asset-receipt', 'asset-commissioning', 'asset-disposal'] as const;
const SYNTHETIC_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('V2 phase 9 — fixed assets module — UI smoke', () => {
  test('catalog list /v2/catalogs/fixed-assets renders (no 500)', async ({ page }) => {
    const res = await page.goto('/en/v2/catalogs/fixed-assets', { waitUntil: 'domcontentloaded' });
    const status = res?.status() ?? 0;
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(500);
  });

  test('catalog new /v2/catalogs/fixed-assets/new renders (no 500)', async ({ page }) => {
    const res = await page.goto('/en/v2/catalogs/fixed-assets/new', {
      waitUntil: 'domcontentloaded',
    });
    const status = res?.status() ?? 0;
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(500);
  });

  for (const slug of DOC_SLUGS) {
    test(`doc list /v2/documents/${slug} renders (no 500)`, async ({ page }) => {
      const res = await page.goto(`/en/v2/documents/${slug}`, { waitUntil: 'domcontentloaded' });
      const status = res?.status() ?? 0;
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
    });

    test(`doc new /v2/documents/${slug}/new renders (no 500)`, async ({ page }) => {
      const res = await page.goto(`/en/v2/documents/${slug}/new`, {
        waitUntil: 'domcontentloaded',
      });
      const status = res?.status() ?? 0;
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
    });

    test(`doc detail /v2/documents/${slug}/[id] handles unknown ID (no 500)`, async ({ page }) => {
      const res = await page.goto(`/en/v2/documents/${slug}/${SYNTHETIC_UUID}`, {
        waitUntil: 'domcontentloaded',
      });
      const status = res?.status() ?? 0;
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(500);
    });
  }
});
