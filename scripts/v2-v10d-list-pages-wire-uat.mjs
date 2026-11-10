import fs from 'node:fs/promises';
// V0.10d UAT — verify list pages now actually fetch & display saved
// invoices/payments (4 routes that previously had rows=[] hardcoded).
//
// Run dev server first: `pnpm dev` (port 3100).
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-v10d-uat';
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const findings = { passed: 0, failed: [] };
let stepCount = 0;
async function shot(label) {
  stepCount += 1;
  const f = `${OUT}/${String(stepCount).padStart(2, '0')}-${label.replace(/[^a-z0-9-]+/gi, '-')}.png`;
  await page.screenshot({ path: f, fullPage: false });
  return f;
}

async function expect(label, fn) {
  try {
    await fn();
    findings.passed += 1;
    console.log(`  ok  ${label}`);
  } catch (err) {
    const file = await shot(`FAIL-${label}`);
    findings.failed.push({ step: label, error: String(err), screenshot: file });
    console.log(`FAIL  ${label} — ${err}`);
  }
}

// Helper: count visible body rows in the document data table.
async function countRows() {
  // The list components render <tbody><tr>... — count those.
  return await page.locator('table.data tbody tr').count();
}

// Sales invoice list — drafts created in earlier test runs should appear here.
await expect('/v2/documents/sales-invoice shows >=1 row after saved drafts', async () => {
  await page.goto(`${BASE}/tr/v2/documents/sales-invoice`, { waitUntil: 'networkidle' });
  const n = await countRows();
  if (n < 1) throw new Error(`Expected ≥1 sales invoice row, got ${n}`);
});

await expect('/v2/purchases/purchase-invoice list page loads without server error', async () => {
  await page.goto(`${BASE}/tr/v2/purchases/purchase-invoice`, { waitUntil: 'networkidle' });
  const errPanel = await page.locator('text=Application error').count();
  if (errPanel > 0) throw new Error('Page shows Next.js error overlay.');
});

await expect('/v2/documents/payment-received list page loads', async () => {
  await page.goto(`${BASE}/tr/v2/documents/payment-received`, { waitUntil: 'networkidle' });
  const errPanel = await page.locator('text=Application error').count();
  if (errPanel > 0) throw new Error('Page shows Next.js error overlay.');
});

await expect('/v2/purchases/payment-sent list page loads', async () => {
  await page.goto(`${BASE}/tr/v2/purchases/payment-sent`, { waitUntil: 'networkidle' });
  const errPanel = await page.locator('text=Application error').count();
  if (errPanel > 0) throw new Error('Page shows Next.js error overlay.');
});

// End-to-end: save a new purchase invoice and confirm it appears in the list.
await expect('create purchase invoice → verify appears in list', async () => {
  await page.goto(`${BASE}/tr/v2/purchases/purchase-invoice/new`, { waitUntil: 'networkidle' });
  const triggers = page.locator('button.combobox-trigger');
  // Supplier
  await triggers.nth(0).click();
  await page.locator('.combobox-popover .combobox-option').first().waitFor({ state: 'visible' });
  await page.locator('.combobox-popover .combobox-option').first().click();
  // Warehouse
  await triggers.nth(1).click();
  await page.locator('.combobox-popover .combobox-option').first().waitFor({ state: 'visible' });
  await page.locator('.combobox-popover .combobox-option').first().click();
  // Product
  await triggers.nth(2).click();
  await page.locator('.combobox-popover .combobox-option').first().waitFor({ state: 'visible' });
  await page.locator('.combobox-popover .combobox-option').first().click();
  await page.locator('input[name="lines[0].quantity"]').fill('1');
  await page.locator('input[name="lines[0].price"]').fill('50');

  // Count before
  await page.goto(`${BASE}/tr/v2/purchases/purchase-invoice`, { waitUntil: 'networkidle' });
  const beforeCount = await countRows();

  // Go back and submit save-draft
  await page.goto(`${BASE}/tr/v2/purchases/purchase-invoice/new`, { waitUntil: 'networkidle' });
  // Re-fill (state didn't persist).
  const t2 = page.locator('button.combobox-trigger');
  await t2.nth(0).click();
  await page.locator('.combobox-popover .combobox-option').first().waitFor({ state: 'visible' });
  await page.locator('.combobox-popover .combobox-option').first().click();
  await t2.nth(1).click();
  await page.locator('.combobox-popover .combobox-option').first().waitFor({ state: 'visible' });
  await page.locator('.combobox-popover .combobox-option').first().click();
  await t2.nth(2).click();
  await page.locator('.combobox-popover .combobox-option').first().waitFor({ state: 'visible' });
  await page.locator('.combobox-popover .combobox-option').first().click();
  await page.locator('input[name="lines[0].quantity"]').fill('1');
  await page.locator('input[name="lines[0].price"]').fill('50');

  const saveBtn = page
    .locator('button.btn-secondary[type="submit"][name="__intent"][value="save"]')
    .first();
  await saveBtn.click();

  // Wait up to 10s for navigation to list.
  await page
    .waitForURL((u) => !u.toString().endsWith('/new'), { timeout: 10000 })
    .catch(() => null);
  await page.waitForLoadState('networkidle');
  const afterCount = await countRows();
  if (afterCount <= beforeCount) {
    throw new Error(
      `Expected row count to INCREASE after save. before=${beforeCount} after=${afterCount}`,
    );
  }
});

await fs.writeFile(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
await browser.close();

const total = findings.passed + findings.failed.length;
console.log(`\n${findings.passed}/${total} passed`);
if (findings.failed.length > 0) {
  for (const f of findings.failed) console.log(`  - ${f.step}: ${f.error}`);
  process.exit(1);
}
process.exit(0);
