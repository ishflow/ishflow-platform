import fs from 'node:fs/promises';
// V2 V0.7 catalogs UAT — autonomous Playwright walk-through.
//
// Uses DEV_AUTH_BYPASS=1 (already in .env.local) so no Clerk sign-in needed.
// Walks products + partners (customer + supplier) + price-types through:
//   list → create → edit → archive → delete loops, plus locale + markup
//   overflow regression.
//
// Output:
//   /tmp/v2-v07-uat/findings.json   — { passed, failed: [{step, error}] }
//   /tmp/v2-v07-uat/<N>-<step>.png  — screenshots per assertion
//
// Run (dev server must already be on localhost:3100):
//   node scripts/v2-v07-catalogs-uat.mjs
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-v07-uat';
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
  console.log(`[step] ${label}`);
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

async function expectText(text, opts = {}) {
  const sel = opts.role ? `${opts.role}:has-text("${text}")` : `text=${text}`;
  await page.waitForSelector(sel, { timeout: 5_000 });
}

async function expectNotText(text) {
  // Brief wait; if it appears we throw.
  const loc = page.locator(`text=${text}`).first();
  await new Promise((r) => setTimeout(r, 800));
  if (await loc.isVisible().catch(() => false)) {
    throw new Error(`unexpected text "${text}" visible on page`);
  }
}

async function getHeaderCount(prefix) {
  // Read the subtitle "<prefix> · N записей" / "<prefix> · N kayıt" / etc.
  const text = await page.textContent('body');
  const m = text?.match(new RegExp(`${prefix}\\D+(\\d+)`));
  return m ? Number.parseInt(m[1], 10) : null;
}

// =====================================================================
// PRODUCTS
// =====================================================================

const PRODUCT_NAME = `QA-UAT-${Date.now()}`;
const PRODUCT_EDITED = `${PRODUCT_NAME}-edited`;

await step('products-list-loads', async () => {
  await page.goto(`${BASE}/v2/catalogs/products`, { waitUntil: 'domcontentloaded' });
  await expectText('Все товары');
});

await step('products-new-shows-draft-entry', async () => {
  await page.goto(`${BASE}/v2/catalogs/products/new`, { waitUntil: 'domcontentloaded' });
  const html = await page.content();
  if (!/Новый черновик|New draft|Yeni taslak/.test(html)) {
    throw new Error('product side panel missing draft entry on /new');
  }
});

// V0.9: record-list panel must engage for every catalog entity record route,
// not just products. Five regression checks — back link + draft pin on every
// /new sub-route across modules.
const RECORD_ROUTE_PANEL_CASES = [
  {
    path: '/v2/catalogs/products/categories/new',
    titlePattern: /Категории номенклатуры|Категории|Categories|Kategoriler/,
  },
  {
    path: '/v2/catalogs/products/groups/new',
    titlePattern: /Группы номенклатуры|Группы|Groups|Gruplar/,
  },
  {
    path: '/v2/catalogs/partners/customers/new',
    titlePattern: /Покупатели|Customers|Müşteriler/,
  },
  {
    path: '/v2/catalogs/partners/suppliers/new',
    titlePattern: /Поставщики|Suppliers|Tedarikçiler/,
  },
  {
    path: '/v2/catalogs/price-types/new',
    titlePattern: /Типы цен|Price Types|Fiyat Türleri/,
  },
  {
    path: '/v2/catalogs/price-types/special/new',
    titlePattern: /Спецпредложения|Special Prices|Özel Fiyatlar/,
  },
];

for (const { path, titlePattern } of RECORD_ROUTE_PANEL_CASES) {
  await step(`record-panel-${path}`, async () => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    if (!/class="panel-back"/.test(html)) {
      throw new Error(`side panel missing "back to catalogs" on ${path}`);
    }
    if (!/Новый черновик|New draft|Yeni taslak/.test(html)) {
      throw new Error(`side panel missing draft pin on ${path}`);
    }
    if (!titlePattern.test(html)) {
      throw new Error(`side panel missing expected title (${titlePattern}) on ${path}`);
    }
  });
}

let beforeProductCount = 0;
await step('products-record-count', async () => {
  await page.goto(`${BASE}/v2/catalogs/products`, { waitUntil: 'domcontentloaded' });
  beforeProductCount = (await getHeaderCount('Товары')) ?? 0;
  console.log(`  baseline product count = ${beforeProductCount}`);
});

await step('products-create-with-extended-fields', async () => {
  await page.click('a:has-text("Новый товар")');
  await page.waitForURL(/products\/new/);
  await page.fill('input[name="name"]', PRODUCT_NAME);
  await page.selectOption('select[name="unit"]', 'kg');
  await page.fill('input[name="costPrice"]', '10.50');
  await page.fill('input[name="listPrice"]', '15.00');
  await page.fill('input[name="minStock"]', '5');
  await page.fill('input[name="maxStock"]', '100');
  await page.fill('textarea[name="description"]', 'QA test description');
  await page.click('button[type="submit"]');
  await page.waitForURL(/products$|products\?/, { timeout: 10_000 });
});

await step('products-create-visible-in-list', async () => {
  await page.goto(`${BASE}/v2/catalogs/products?q=${encodeURIComponent(PRODUCT_NAME)}`, {
    waitUntil: 'domcontentloaded',
  });
  await expectText(PRODUCT_NAME);
});

await step('products-edit', async () => {
  await page.click(`a:has-text("${PRODUCT_NAME}")`);
  await page.waitForURL(/products\/[a-f0-9-]+$/);
  const input = page.locator('input[name="name"]');
  await input.fill(PRODUCT_EDITED);
  await page.click('button[type="submit"]:has-text("Сохранить")');
  await page.waitForURL(/products$|products\?/, { timeout: 10_000 });
});

await step('products-edit-persisted', async () => {
  await page.goto(`${BASE}/v2/catalogs/products?q=${encodeURIComponent(PRODUCT_EDITED)}`, {
    waitUntil: 'domcontentloaded',
  });
  await expectText(PRODUCT_EDITED);
});

await step('products-extended-fields-roundtrip', async () => {
  await page.goto(`${BASE}/v2/catalogs/products?q=${encodeURIComponent(PRODUCT_EDITED)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.click(`a:has-text("${PRODUCT_EDITED}")`);
  await page.waitForURL(/products\/[a-f0-9-]+$/);
  const unit = await page.inputValue('select[name="unit"]');
  const cost = await page.inputValue('input[name="costPrice"]');
  const list = await page.inputValue('input[name="listPrice"]');
  const desc = await page.inputValue('textarea[name="description"]');
  if (unit !== 'kg') throw new Error(`unit roundtrip failed: got "${unit}"`);
  if (Number(cost) !== 10.5) throw new Error(`costPrice roundtrip failed: got "${cost}"`);
  if (Number(list) !== 15.0) throw new Error(`listPrice roundtrip failed: got "${list}"`);
  if (desc !== 'QA test description')
    throw new Error(`description roundtrip failed: got "${desc}"`);
});

await step('products-delete', async () => {
  // After roundtrip, we may be on the detail page already; navigate back to list.
  await page.goto(`${BASE}/v2/catalogs/products?q=${encodeURIComponent(PRODUCT_EDITED)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.click(`a:has-text("${PRODUCT_EDITED}")`);
  await page.waitForURL(/products\/[a-f0-9-]+$/);
  // Open AlertDialog
  await page.click('button:has-text("Удалить")');
  await page.waitForSelector('text=Удалить эту запись?', { timeout: 4_000 });
  // The AlertDialogAction is the second "Удалить" / "Удаление..." button — pick it specifically.
  await page.locator('[role="alertdialog"] button:has-text("Удалить")').click();
  await page.waitForURL(/products$|products\?/, { timeout: 10_000 });
});

await step('products-delete-gone-from-list', async () => {
  await page.goto(`${BASE}/v2/catalogs/products?q=${encodeURIComponent(PRODUCT_EDITED)}`, {
    waitUntil: 'domcontentloaded',
  });
  await expectNotText(PRODUCT_EDITED);
});

// =====================================================================
// CUSTOMERS
// =====================================================================

const CUSTOMER_NAME = `QA-CUST-${Date.now()}`;
const CUSTOMER_EDITED = `${CUSTOMER_NAME}-edited`;

await step('customers-list-loads', async () => {
  await page.goto(`${BASE}/v2/catalogs/partners/customers`, { waitUntil: 'domcontentloaded' });
  await expectText('Новый покупатель');
});

await step('customers-create', async () => {
  await page.click('a:has-text("Новый покупатель")');
  await page.waitForURL(/customers\/new/);
  await page.fill('input[name="name"]', CUSTOMER_NAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(/customers$|customers\?/, { timeout: 10_000 });
});

await step('customers-create-visible-in-list', async () => {
  await page.goto(`${BASE}/v2/catalogs/partners/customers?q=${encodeURIComponent(CUSTOMER_NAME)}`);
  await expectText(CUSTOMER_NAME);
});

await step('customers-edit-then-delete', async () => {
  await page.click(`a:has-text("${CUSTOMER_NAME}")`);
  await page.waitForURL(/customers\/[a-f0-9-]+/);
  await page.locator('input[name="name"]').fill(CUSTOMER_EDITED);
  await page.fill('input[name="email"]', 'qa@example.com');
  await page.click('button[type="submit"]:has-text("Сохранить")');
  await page.waitForURL(/customers$|customers\?/, { timeout: 10_000 });

  await page.goto(
    `${BASE}/v2/catalogs/partners/customers?q=${encodeURIComponent(CUSTOMER_EDITED)}`,
  );
  await expectText(CUSTOMER_EDITED);

  await page.click(`a:has-text("${CUSTOMER_EDITED}")`);
  await page.click('button:has-text("Удалить")');
  await page.locator('[role="alertdialog"] button:has-text("Удалить")').click();
  await page.waitForURL(/customers$|customers\?/, { timeout: 10_000 });
});

// =====================================================================
// SUPPLIERS
// =====================================================================

const SUPPLIER_NAME = `QA-SUPP-${Date.now()}`;

await step('suppliers-list-loads', async () => {
  await page.goto(`${BASE}/v2/catalogs/partners/suppliers`, { waitUntil: 'domcontentloaded' });
  await expectText('Новый поставщик');
});

await step('suppliers-create-edit-delete', async () => {
  await page.click('a:has-text("Новый поставщик")');
  await page.waitForURL(/suppliers\/new/);
  await page.fill('input[name="name"]', SUPPLIER_NAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(/suppliers$|suppliers\?/, { timeout: 10_000 });

  await page.goto(`${BASE}/v2/catalogs/partners/suppliers?q=${encodeURIComponent(SUPPLIER_NAME)}`);
  await expectText(SUPPLIER_NAME);

  await page.click(`a:has-text("${SUPPLIER_NAME}")`);
  await page.click('button:has-text("Удалить")');
  await page.locator('[role="alertdialog"] button:has-text("Удалить")').click();
  await page.waitForURL(/suppliers$|suppliers\?/, { timeout: 10_000 });
});

// =====================================================================
// PRICE TYPES — including markupPct overflow regression
// =====================================================================

const PT_STATIC = `QA-PT-STA-${Date.now()}`;
const PT_DYNAMIC = `QA-PT-DYN-${Date.now()}`;

await step('price-types-list-loads', async () => {
  await page.goto(`${BASE}/v2/catalogs/price-types`, { waitUntil: 'domcontentloaded' });
  // Page may have no rows; just confirm subtitle renders.
  await expectText('Типы цен');
});

await step('price-types-create-static', async () => {
  await page.goto(`${BASE}/v2/catalogs/price-types/new?kind=static`);
  await page.fill('input[name="name"]', PT_STATIC);
  await page.click('button[type="submit"]');
  await page.waitForURL(/price-types$|price-types\?/, { timeout: 10_000 });
});

await step('price-types-static-visible', async () => {
  await page.goto(`${BASE}/v2/catalogs/price-types?q=${encodeURIComponent(PT_STATIC)}`);
  await expectText(PT_STATIC);
});

await step('price-types-create-dynamic-with-markup-20', async () => {
  // The CRITICAL bug: markup=20 used to raise Postgres numeric overflow.
  await page.goto(`${BASE}/v2/catalogs/price-types/new?kind=dynamic`);
  await page.fill('input[name="name"]', PT_DYNAMIC);
  // Pick the first available base via the RefCombobox.
  await page.click('.combobox-trigger');
  await page.waitForSelector('.combobox-popover');
  await page.locator('.combobox-option').first().click();
  await page.fill('input[name="markupPct"]', '20');
  await page.click('button[type="submit"]');
  await page.waitForURL(/price-types$|price-types\?/, { timeout: 10_000 });
});

await step('price-types-dynamic-visible-no-overflow', async () => {
  await page.goto(`${BASE}/v2/catalogs/price-types?q=${encodeURIComponent(PT_DYNAMIC)}`);
  await expectText(PT_DYNAMIC);
  // Markup should display as 20.00% (DB stored 0.2000, list multiplies by 100).
  await expectText('20.00%');
});

await step('price-types-cleanup-delete', async () => {
  for (const name of [PT_STATIC, PT_DYNAMIC]) {
    await page.goto(`${BASE}/v2/catalogs/price-types?q=${encodeURIComponent(name)}`);
    await page.click(`a:has-text("${name}")`);
    await page.waitForURL(/price-types\/[a-f0-9-]+/);
    await page.click('button:has-text("Удалить")');
    await page.locator('[role="alertdialog"] button:has-text("Удалить")').click();
    await page.waitForURL(/price-types$|price-types\?/, { timeout: 10_000 });
  }
});

// =====================================================================

await ctx.close();
await browser.close();

await fs.writeFile(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
console.log(`\n[uat] ${findings.passed} passed · ${findings.failed.length} failed`);
console.log(`[uat] screenshots: ${OUT}`);
if (findings.failed.length > 0) {
  for (const f of findings.failed) {
    console.log(`  - ${f.step}: ${f.error}`);
  }
  process.exit(1);
}
process.exit(0);
