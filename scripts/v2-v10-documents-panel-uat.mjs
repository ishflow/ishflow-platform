import fs from 'node:fs/promises';
// V2 V0.10 documents-panel UAT — Playwright walk-through.
//
// Verifies the side panel on all 9 document/movement record routes
// matches the HTML mockup (record-list panel, not entity nav).
//
// Uses DEV_AUTH_BYPASS=1 (already in .env.local) so no Clerk sign-in needed.
//
// Output:
//   /tmp/v2-v10-uat/findings.json   — { passed, failed: [{step, error}] }
//   /tmp/v2-v10-uat/<N>-<step>.png  — screenshots per assertion
//
// Run (dev server must already be on localhost:3100):
//   node scripts/v2-v10-documents-panel-uat.mjs
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-v10-uat';
await fs.mkdir(OUT, { recursive: true });

const findings = { passed: 0, failed: [] };
let stepCount = 0;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

async function screenshot(label) {
  stepCount += 1;
  const file = `${OUT}/${String(stepCount).padStart(2, '0')}-${label.replace(/[^a-z0-9-]+/gi, '-')}.png`;
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function expect(label, fn) {
  try {
    await fn();
    findings.passed += 1;
    console.log(`  ok  ${label}`);
  } catch (err) {
    const file = await screenshot(`FAIL-${label}`);
    findings.failed.push({ step: label, error: String(err), screenshot: file });
    console.log(`FAIL  ${label} — ${err}`);
  }
}

async function gotoPanel(url) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
}

async function panelContains(...needles) {
  const text = (await page.locator('aside.panel').first().textContent()) ?? '';
  for (const n of needles) {
    if (!text.includes(n)) {
      throw new Error(`Panel missing "${n}". Got: ${text.slice(0, 240)}`);
    }
  }
}

async function panelMissing(...needles) {
  const text = (await page.locator('aside.panel').first().textContent()) ?? '';
  for (const n of needles) {
    if (text.includes(n)) {
      throw new Error(`Panel unexpectedly contains "${n}". Got: ${text.slice(0, 240)}`);
    }
  }
}

// ─── Single-list panels (invoice/payment/warehouses) ──────────────────────

await expect('sales-invoice /new shows Satış Faturaları + (Yeni taslak)', async () => {
  await gotoPanel('/tr/v2/documents/sales-invoice/new');
  await panelContains('Satış Faturaları', '(Yeni taslak)');
});

await expect('purchase-invoice /new shows Alış Faturaları', async () => {
  await gotoPanel('/tr/v2/purchases/purchase-invoice/new');
  await panelContains('Alış Faturaları', '(Yeni taslak)');
});

await expect('payment-received /new shows Ödeme Tahsilatları', async () => {
  await gotoPanel('/tr/v2/documents/payment-received/new');
  await panelContains('Ödeme Tahsilatları', '(Yeni taslak)');
});

await expect('payment-sent /new shows Tedarikçi Ödemeleri', async () => {
  await gotoPanel('/tr/v2/purchases/payment-sent/new');
  await panelContains('Tedarikçi Ödemeleri', '(Yeni taslak)');
});

await expect('warehouses /new shows Depolar + back to Kataloglar', async () => {
  await gotoPanel('/tr/v2/catalogs/warehouses/new');
  await panelContains('Depolar', 'Kataloglar');
});

// ─── Dual-list panels (stock movements) ───────────────────────────────────

await expect('return-invoice /new shows Stok Hareketleri + Bu iadeler', async () => {
  await gotoPanel('/tr/v2/documents/return-invoice/new');
  await panelContains('Stok Hareketleri', 'Bu iadeler', '(Yeni taslak)');
});

await expect('stock-transfer /new shows Stok Hareketleri + Son transferler', async () => {
  await gotoPanel('/tr/v2/documents/stock-transfer/new');
  await panelContains('Stok Hareketleri', 'Son transferler', '(Yeni taslak)');
});

await expect('inventory-count /new shows Stok Hareketleri + Bu sayımlar', async () => {
  await gotoPanel('/tr/v2/documents/inventory-count/new');
  await panelContains('Stok Hareketleri', 'Bu sayımlar', '(Yeni taslak)');
});

await expect('stock-adjustment /new shows Stok Hareketleri + Bu düzeltmeler', async () => {
  await gotoPanel('/tr/v2/documents/stock-adjustment/new');
  await panelContains('Stok Hareketleri', 'Bu düzeltmeler', '(Yeni taslak)');
});

// ─── List route still uses entity-nav default panel ───────────────────────

await expect('sales-invoice list route does NOT show document panel', async () => {
  await gotoPanel('/tr/v2/documents/sales-invoice');
  // default panel has no .panel-list with "(Yeni taslak)" — and shows entity nav
  await panelMissing('(Yeni taslak)');
});

// ─── Sublabel removal: customer combobox shows only names ─────────────────

await expect('customer combobox in sales invoice has no email/phone sublabel', async () => {
  await gotoPanel('/tr/v2/documents/sales-invoice/new');
  // Open the customer combobox (first one in the form is customer).
  const trigger = page.locator('button.combobox-trigger').first();
  await trigger.click();
  await page.locator('.combobox-popover').waitFor({ state: 'visible' });
  // dim sublabel span = sublabel — assert there are none.
  const dimCount = await page.locator('.combobox-popover .combobox-option .dim').count();
  if (dimCount > 0) {
    throw new Error(`Found ${dimCount} sublabel span(s); customer combobox should be name-only.`);
  }
});

// ─── Outside-click closes combobox ────────────────────────────────────────

await expect('outside-click closes customer combobox', async () => {
  // Already open from previous step; click on a non-combobox area.
  await page.locator('.topbar').click();
  // Popover should be gone.
  const open = await page.locator('.combobox-popover').count();
  if (open > 0) {
    throw new Error('Combobox popover still visible after outside click.');
  }
});

await fs.writeFile(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
await browser.close();

const total = findings.passed + findings.failed.length;
console.log(`\n${findings.passed}/${total} passed`);
if (findings.failed.length > 0) {
  console.log('FAILURES:');
  for (const f of findings.failed) {
    console.log(`  - ${f.step}: ${f.error}`);
  }
  process.exit(1);
}
process.exit(0);
