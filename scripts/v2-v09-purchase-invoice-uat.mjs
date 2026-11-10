import fs from 'node:fs/promises';
// V2 V0.9 purchase-invoice migration UAT — autonomous Playwright walk-through.
//
// Uses DEV_AUTH_BYPASS=1 (already in .env.local) so no Clerk sign-in needed.
// Covers /v2/purchases/purchase-invoice/new full flow:
//   "Alışlar" breadcrumb (section label fix) + 3 new DSL fields
//   (supplierDocNo / paymentTerms / notes) + purchase tips aside +
//   sticky bar + Save → list redirect → reopen detail route.
//
// Run (dev server must be on localhost:3100):
//   node scripts/v2-v09-purchase-invoice-uat.mjs
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-v09-purchase-uat';
await fs.mkdir(OUT, { recursive: true });

const findings = { passed: 0, failed: [] };
let stepCount = 0;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

async function screenshot(label) {
  stepCount += 1;
  const file = `${OUT}/${String(stepCount).padStart(2, '0')}-${label.replace(/[^a-z0-9-]+/gi, '-')}.png`;
  await page.screenshot({ path: file, fullPage: true });
}

async function step(label, fn) {
  console.info(`[step] ${label}`);
  try {
    await fn();
    await screenshot(label);
    findings.passed += 1;
  } catch (err) {
    console.error(`[FAIL] ${label}: ${err.message}`);
    await screenshot(`fail-${label}`);
    findings.failed.push({ step: label, error: err.message, url: page.url() });
  }
}

async function expectText(text) {
  await page.waitForSelector(`text=${text}`, { timeout: 5_000 });
}

// =========================================================================
// CASE 1 — /new renders + correct section label + all DSL fields visible
// =========================================================================

await step('purchase-invoice-new-loads-200', async () => {
  const resp = await page.goto(`${BASE}/tr/v2/purchases/purchase-invoice/new`, {
    waitUntil: 'domcontentloaded',
  });
  if (!resp || resp.status() !== 200) throw new Error(`status ${resp?.status()}`);
});

await step('breadcrumb-says-Alislar-not-Satislar', async () => {
  // V2Topbar renders a <div class="topbar"> with a <div class="breadcrumb">.
  // sectionLabelKeyForSlug('purchase-invoice') → 'purchases' → tNav('purchases') = "Alışlar".
  const crumb = page.locator('.topbar .breadcrumb').first();
  await crumb.waitFor({ state: 'visible', timeout: 5_000 });
  const text = (await crumb.textContent()) ?? '';
  if (!text.includes('Alış')) {
    throw new Error(`expected "Alış" in breadcrumb, got: "${text}"`);
  }
  if (text.includes('Satışlar')) {
    throw new Error('breadcrumb still says "Satışlar" — section label fix did not stick');
  }
});

await step('all-dsl-fields-render', async () => {
  // From DSL: date, supplier, warehouse, supplierDocNo, paymentTerms, notes.
  // assignedBuyerId is formHidden, no label visible.
  await expectText('Tarih');
  await expectText('Tedarikçi');
  await expectText('Depo');
  await expectText('Tedarikçi belge no');
  await expectText('Ödeme vadesi');
  await expectText('Açıklama');
});

await step('payment-terms-select-has-four-options', async () => {
  // The enum field renders as <select>. Its options are hidden text in the
  // closed dropdown, so `text=` doesn't see them — read option values + text
  // directly via the DOM.
  const select = page
    .locator(
      'label:has-text("Ödeme vadesi") + div select, label:has-text("Ödeme vadesi") ~ * select',
    )
    .first();
  if ((await select.count()) === 0) {
    throw new Error('paymentTerms <select> not found on page');
  }
  const optionData = await select
    .locator('option')
    .evaluateAll((opts) => opts.map((o) => ({ value: o.value, text: o.textContent ?? '' })));
  const values = optionData.map((o) => o.value);
  const labels = optionData.map((o) => o.text).join(' | ');
  for (const v of ['cash', '30d', '45d', '60d']) {
    if (!values.includes(v)) throw new Error(`missing enum value ${v}; got ${values.join(',')}`);
  }
  for (const w of ['Peşin', '30 gün', '45 gün', '60 gün']) {
    if (!labels.includes(w)) throw new Error(`missing label "${w}"; got "${labels}"`);
  }
});

await step('sticky-bottom-save-bar-visible', async () => {
  const bar = page.locator('.sticky-save-bar');
  if (!(await bar.isVisible())) throw new Error('sticky-save-bar not rendered');
  await expectText('Kaydet ve Posta Et');
});

await step('tips-card-shows-purchase-bullets', async () => {
  // v2_documents.new.tips.item1/2/3 (tr) — purchase-specific:
  await expectText('Belge no onayda otomatik atanır');
  await expectText('Onayladığında stok ve borçlar kayıtları üretilir');
  await expectText('Taslak halinde her zaman düzenleyebilirsin');
});

await step('attachments-card-renders', async () => {
  // DocumentAttachmentsCard title is from v2_documents.new.attachments.title (tr).
  // The card-title text "Ekler" should appear in the aside.
  const cards = await page.locator('.card-title').allTextContents();
  if (!cards.some((c) => /Ekler/.test(c))) {
    throw new Error(`Ekler card-title not in aside; titles: ${cards.join(' | ')}`);
  }
});

// =========================================================================
// CASE 2 — fill form: date + supplier + warehouse + line product + qty
// =========================================================================

await step('fill-date-and-pick-supplier', async () => {
  // datetime-local needs a value to satisfy native required validation.
  const dateInput = page.locator('input[type="datetime-local"]');
  if ((await dateInput.count()) > 0) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    await dateInput.fill(iso);
    await page.waitForTimeout(200);
  }

  // Header DSL order: date, supplier(ref), warehouse(ref), supplierDocNo(text),
  // paymentTerms(select), notes(textarea). Supplier is the FIRST combobox-trigger.
  const triggers = page.locator('.combobox-trigger');
  const count = await triggers.count();
  if (count === 0) throw new Error('no .combobox-trigger elements on /new');

  await triggers.first().click({ force: true });
  await page.waitForTimeout(600);

  const opt = page.locator('.combobox-option').first();
  if ((await opt.count()) === 0) {
    throw new Error('supplier options not visible — seed has no purchases.supplier rows?');
  }
  await opt.click({ force: true });
  await page.waitForTimeout(500);
});

await step('pick-warehouse-via-combobox', async () => {
  // warehouse is the SECOND ref combobox (after supplier).
  const fieldDiv = page.locator('label:has-text("Depo") + div.field');
  let warehouseTrigger = null;
  if ((await fieldDiv.count()) > 0) {
    warehouseTrigger = fieldDiv.locator('.combobox-trigger').first();
  }
  if (!warehouseTrigger || (await warehouseTrigger.count()) === 0) {
    // Fallback: 2nd .combobox-trigger overall (supplier was the 1st).
    const triggers = page.locator('.combobox-trigger');
    warehouseTrigger = triggers.nth(1);
  }

  await warehouseTrigger.click({ force: true });
  await page.waitForTimeout(500);
  const opt = page.locator('.combobox-option').first();
  if ((await opt.count()) === 0) {
    throw new Error('warehouse options not visible — seed has no inventory.warehouse rows?');
  }
  await opt.click({ force: true });
  await page.waitForTimeout(400);
});

await step('fill-supplier-doc-no-and-payment-terms', async () => {
  // supplierDocNo is a free text input. Fill it.
  const docNoInput = page
    .locator(
      'label:has-text("Tedarikçi belge no") + div input, label:has-text("Tedarikçi belge no") ~ * input[type="text"]',
    )
    .first();
  if ((await docNoInput.count()) > 0) {
    await docNoInput.fill('VENDOR-2026-0001');
  }

  // paymentTerms is a <select>. Pick "30 gün".
  const select = page
    .locator(
      'label:has-text("Ödeme vadesi") + div select, label:has-text("Ödeme vadesi") ~ * select',
    )
    .first();
  if ((await select.count()) > 0) {
    await select.selectOption('30d');
  }
});

await step('pick-product-in-line-row', async () => {
  const firstRow = page.locator('tbody tr').first();
  const productTrigger = firstRow.locator('.combobox-trigger').first();
  if ((await productTrigger.count()) === 0) {
    throw new Error('product combobox not found in first line row');
  }

  await productTrigger.click({ force: true });
  await page.waitForTimeout(600);
  const opt = page.locator('.combobox-option').first();
  if ((await opt.count()) === 0) {
    throw new Error('product options not visible — seed has no inventory.product rows?');
  }
  await opt.click({ force: true });
  await page.waitForTimeout(500);

  const qtyInput = firstRow.locator('input[type="number"]').first();
  if ((await qtyInput.count()) === 0) throw new Error('quantity input not found');
  await qtyInput.fill('5');
  await qtyInput.dispatchEvent('change');
  await page.waitForTimeout(200);

  // Set a positive price too. Price is the 2nd number input in the row.
  const numInputs = firstRow.locator('input[type="number"]');
  const inputCount = await numInputs.count();
  const priceInput = inputCount >= 2 ? numInputs.nth(1) : numInputs.first();
  await priceInput.fill('250');
  await priceInput.dispatchEvent('change');
  await page.waitForTimeout(200);
});

// =========================================================================
// CASE 3 — save → list redirect under /v2/purchases/...
// =========================================================================

await step('save-draft-and-list-redirect', async () => {
  const saveBtn = page
    .locator('.sticky-save-bar button[type="submit"]')
    .filter({ hasText: /^Kaydet$/ })
    .first();
  if ((await saveBtn.count()) === 0) {
    throw new Error('Kaydet button not found in .sticky-save-bar');
  }
  await saveBtn.click();

  // listHrefForDocumentSlug('purchase-invoice') = '/v2/purchases/purchase-invoice'
  await page.waitForURL(
    (url) => {
      const p = url.pathname;
      return (
        p.includes('/v2/purchases/purchase-invoice') &&
        !p.includes('/new') &&
        !/[0-9a-f]{8}-[0-9a-f]{4}/.test(p)
      );
    },
    { timeout: 10_000 },
  );
});

// =========================================================================
// CASE 4 — open newest invoice from list, verify detail loads
// =========================================================================

await step('open-detail-from-list', async () => {
  await page.goto(`${BASE}/tr/v2/purchases/purchase-invoice`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(800);

  // Find any link to a detail UUID under /v2/purchases/purchase-invoice/<uuid>.
  const links = page.locator('a[href*="/v2/purchases/purchase-invoice/"]').filter({
    hasNotText: /Yeni|new/i,
  });
  const linkCount = await links.count();
  if (linkCount === 0) {
    throw new Error('no purchase-invoice detail links visible in list');
  }
  // Walk the links and click the first one whose href ends with a uuid-ish suffix.
  let clicked = false;
  for (let i = 0; i < linkCount; i++) {
    const href = await links.nth(i).getAttribute('href');
    if (href && /\/v2\/purchases\/purchase-invoice\/[0-9a-f]{8}-[0-9a-f]{4}/.test(href)) {
      await links.nth(i).click();
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    // Fallback: just click the first one and hope routing works.
    await links.first().click();
  }

  await page.waitForURL(/\/v2\/purchases\/purchase-invoice\/[0-9a-f]{8}-[0-9a-f]{4}/, {
    timeout: 8_000,
  });
});

await step('detail-page-has-sticky-bar-and-fields', async () => {
  const bar = page.locator('.sticky-save-bar');
  await bar.waitFor({ state: 'visible', timeout: 5_000 });
  // Detail must still render the 3 new fields (edit mode reuses the same form).
  await expectText('Tedarikçi belge no');
  await expectText('Ödeme vadesi');
  await expectText('Açıklama');
});

// =========================================================================
// WRAP-UP
// =========================================================================

console.info('\n[summary]', JSON.stringify(findings, null, 2));
await fs.writeFile(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
await browser.close();

if (findings.failed.length > 0) process.exit(1);
