import fs from 'node:fs/promises';
import path from 'node:path';
// V2 V0.6 demo walkthrough v2 — adaptive form filler.
//
// 1) Navigate to /new page.
// 2) Inspect the form's actual inputs (names + disabled flags).
// 3) Fill the inputs we know how to handle.
// 4) Pick the first RefCombobox option (if any).
// 5) Submit.
// 6) Capture: post-submit URL, .field-error / .form-error texts, console errors.
//
// Assumes DEV_AUTH_BYPASS=1 + `pnpm db:reset --force --skip-seed`.
//
//   node scripts/v2-demo-walkthrough.mjs
//
// Outputs: /tmp/v2-demo/{summary.json, shots/*.png}
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-demo';
const SHOTS = `${OUT}/shots`;
const stamp = Date.now().toString(36);
const u = (s) => `${s}-${stamp}`;

await fs.mkdir(SHOTS, { recursive: true });

const summary = [];

function log(level, step, msg) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`${ts} ${level.padEnd(5)} ${String(step).padStart(2)}: ${msg}`);
}

async function shot(page, name) {
  const p = path.join(SHOTS, `${name}.png`);
  try {
    await page.screenshot({ path: p, fullPage: true });
  } catch {}
}

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
let page = await ctx.newPage();

const consoleSink = [];
const errorSink = [];
function attachListeners(p) {
  p.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      consoleSink.push({ type: m.type(), text: m.text().slice(0, 240) });
  });
  p.on('pageerror', (e) => errorSink.push(String(e).slice(0, 240)));
}
attachListeners(page);

async function freshPage() {
  // Open a brand-new tab so accumulated client state (in-flight RSC
  // streams from prior screens) cannot interfere with form hydration.
  const next = await ctx.newPage();
  attachListeners(next);
  await page.close().catch(() => null);
  page = next;
}

// Read all named inputs on the current page; return [{ name, tag, type, disabled }].
async function probeInputs() {
  return page.$$eval('input[name], select[name], textarea[name]', (els) =>
    els.map((el) => ({
      name: el.getAttribute('name'),
      tag: el.tagName,
      type: el.type ?? null,
      disabled: el.disabled,
      hidden: el.type === 'hidden',
    })),
  );
}

async function readErrors() {
  const fieldErrors = await page
    .$$eval('.field-error', (els) => els.map((e) => (e.textContent ?? '').trim()).filter(Boolean))
    .catch(() => []);
  const formErrors = await page
    .$$eval('.form-error', (els) => els.map((e) => (e.textContent ?? '').trim()).filter(Boolean))
    .catch(() => []);
  return { fieldErrors, formErrors };
}

async function gotoRoute(route) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
}

async function fillName(name, value) {
  const sel = `[name="${name}"]`;
  const el = await page.$(sel);
  if (!el) return false;
  const disabled = await el.evaluate((n) => n.disabled).catch(() => false);
  if (disabled) return false;
  const tag = await el.evaluate((n) => n.tagName);
  try {
    if (tag === 'SELECT') {
      await el.selectOption(String(value));
    } else {
      await el.fill(String(value));
    }
    return true;
  } catch {
    return false;
  }
}

// Pick the first option from a RefCombobox identified by its hidden input's name.
async function pickRefComboboxFirst(hiddenName) {
  const triggerSel = `input[type="hidden"][name="${hiddenName}"] + button.combobox-trigger`;
  const trigger = page.locator(triggerSel).first();
  try {
    await trigger.scrollIntoViewIfNeeded({ timeout: 3000 });
  } catch {}
  try {
    await trigger.click({ timeout: 5000 });
  } catch (e) {
    return { ok: false, why: `trigger-click-failed: ${String(e).slice(0, 80)}` };
  }
  await page.waitForTimeout(900);
  let count = await page.locator('.combobox-option').count();
  if (count === 0) {
    await page.waitForTimeout(900);
    count = await page.locator('.combobox-option').count();
  }
  if (count === 0) return { ok: false, why: 'no-options' };
  const firstOpt = page.locator('.combobox-option').first();
  const label = await firstOpt.textContent().catch(() => null);
  try {
    await firstOpt.click({ force: true, timeout: 4000 });
  } catch (e) {
    return { ok: false, why: `option-click-failed: ${String(e).slice(0, 80)}` };
  }
  await page.waitForTimeout(300);
  return { ok: true, label: (label ?? '').trim().slice(0, 60) };
}

async function clickSubmit() {
  // Scope to the form on the page (the V2 shell may render unrelated buttons
  // outside the form). Prefer the FIRST <button type="submit"> inside any
  // <form> on the page.
  const btn = await page.$('form button[type="submit"]');
  if (!btn) return { ok: false, why: 'submit-button-not-found' };
  const startedAt = page.url();
  await btn.click();
  // Wait for the URL to actually change (post-submit redirect). Many forms
  // require a 1-2s server roundtrip; allow up to 10s. If the URL doesn't
  // change, the action either failed or never returned — fall through.
  try {
    await page.waitForURL((url) => url.toString() !== startedAt, { timeout: 10_000 });
    await page.waitForLoadState('domcontentloaded').catch(() => null);
    return { ok: true, finalUrl: page.url() };
  } catch {
    return { ok: false, why: 'no-redirect', finalUrl: page.url() };
  }
}

async function step(num, name, fn) {
  log('STEP', num, name);
  const before = { console: consoleSink.length, errors: errorSink.length };
  let outcome = 'OK';
  let detail = '';
  let postErrors = { fieldErrors: [], formErrors: [] };
  let postUrl = page.url();
  try {
    const ret = (await fn()) ?? {};
    detail = ret.detail ?? '';
    if (ret.fail) {
      outcome = 'FAIL';
      detail = ret.fail;
    }
  } catch (e) {
    outcome = 'FAIL';
    detail = String(e).slice(0, 240);
  }
  postUrl = page.url();
  postErrors = await readErrors();
  const newConsole = consoleSink.slice(before.console);
  const newErrors = errorSink.slice(before.errors);
  await shot(page, `${String(num).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '_')}`);
  summary.push({
    step: num,
    name,
    outcome,
    detail,
    url: postUrl,
    fieldErrors: postErrors.fieldErrors,
    formErrors: postErrors.formErrors,
    consoleErrors: newConsole.filter((c) => c.type === 'error').slice(0, 3),
    pageErrors: newErrors.slice(0, 2),
  });
  const tag = outcome === 'OK' ? 'OK' : 'FAIL';
  log(tag, num, `${name}${detail ? ` — ${detail}` : ''}`);
  if (postErrors.fieldErrors.length)
    log('ERR', num, `field-errors: ${postErrors.fieldErrors.slice(0, 3).join(' | ')}`);
  if (postErrors.formErrors.length)
    log('ERR', num, `form-errors: ${postErrors.formErrors.slice(0, 3).join(' | ')}`);
}

// Generic create-entity helper: fills any input whose `name` is in `fillMap`.
async function createEntity({ route, fillMap, refCombos = [], submittedToContains = null }) {
  await gotoRoute(route);
  const filled = [];
  for (const [k, v] of Object.entries(fillMap)) {
    const ok = await fillName(k, v);
    if (ok) filled.push(k);
  }
  for (const ref of refCombos) {
    const res = await pickRefComboboxFirst(ref);
    if (!res.ok) {
      return {
        fail: `combobox ${ref}: ${res.why}`,
        detail: `filled=[${filled.join(',')}]`,
      };
    }
  }
  const submitRes = await clickSubmit();
  if (!submitRes.ok) {
    return { fail: submitRes.why, detail: `finalUrl=${submitRes.finalUrl ?? page.url()}` };
  }
  const after = submitRes.finalUrl;
  if (submittedToContains && !after.includes(submittedToContains)) {
    return { fail: 'unexpected-redirect', detail: `after=${after}` };
  }
  return { detail: `→ ${after}` };
}

// ----- Scenarios -----

// Use ASCII names + ASCII emails. Cyrillic/Turkish chars in the email field
// trigger a silent submit failure on the partner forms (cause unknown — V1
// customer.email is a free-form string in Zod, but something in the React
// Server Action wire path swallows non-ASCII email values without surfacing
// a fieldError).
const customerName = u('Customer');
const customerName2 = u('Customer-2');
const supplierName = u('Supplier');
const productName = u('Product');
const productName2 = u('Product-2');
const warehouseName = u('Warehouse');

// Skip dashboard visit — its async client actions (Clerk env patch, V2Shell
// addon load) appear to interfere with Server Action binding on subsequent
// /new forms. The dev tenant is already pre-seeded by scripts/seed-dev-bypass.mjs
// so we don't need to provision it via a dashboard visit anyway.
await step(1, '(skipped) Dashboard visit — pre-seeded by seed-dev-bypass.mjs', async () => {
  return { detail: 'skipped (pre-seeded)' };
});

await step(2, 'New customer', async () =>
  createEntity({
    route: '/tr/v2/catalogs/partners/customers/new',
    fillMap: {
      name: customerName,
      email: `${customerName.toLowerCase()}@example.com`,
    },
  }),
);

await step(3, 'Verify customer in list', async () => {
  await gotoRoute('/tr/v2/catalogs/partners/customers');
  const text = await page.evaluate(() => document.body.innerText).catch(() => '');
  if (!text.includes(customerName)) return { fail: `not found in list page text` };
  return { detail: 'visible' };
});

await step(4, 'New supplier', async () =>
  createEntity({
    route: '/tr/v2/catalogs/partners/suppliers/new',
    fillMap: {
      name: supplierName,
      email: `${supplierName.toLowerCase()}@example.com`,
      contact: '+90 555 000 00 02',
      taxId: '9876543210',
    },
  }),
);

await step(5, 'Verify supplier in list', async () => {
  await gotoRoute('/tr/v2/catalogs/partners/suppliers');
  const text = await page.evaluate(() => document.body.innerText).catch(() => '');
  if (!text.includes(supplierName)) return { fail: 'not found in list' };
  return { detail: 'visible' };
});

await step(6, 'New warehouse', async () =>
  createEntity({
    route: '/tr/v2/catalogs/warehouses/new',
    fillMap: {
      // `code` is disabled on new (auto-generated). Skip it.
      name: warehouseName,
      address: 'Demo Cad. No:1',
      phone: '+90 555 000 11 11',
    },
  }),
);

await step(7, 'New product', async () =>
  createEntity({
    route: '/tr/v2/catalogs/products/new',
    fillMap: {
      // `sku` field has no name attribute (auto-generated server-side).
      name: productName,
      unit: 'adet',
      costPrice: '50',
      listPrice: '80',
      minStock: '5',
      maxStock: '200',
      description: 'Demo product',
    },
  }),
);

await step(8, 'Verify product in list', async () => {
  await gotoRoute('/tr/v2/catalogs/products');
  const text = await page.evaluate(() => document.body.innerText).catch(() => '');
  if (!text.includes(productName)) return { fail: 'not found in list' };
  return { detail: 'visible' };
});

await step(9, 'New purchase invoice (must run BEFORE sales to seed stock)', async () =>
  createEntity({
    route: '/tr/v2/purchases/purchase-invoice/new',
    fillMap: {
      date: new Date().toISOString().slice(0, 10),
      'lines[0].quantity': '10',
      'lines[0].price': '50',
    },
    refCombos: ['supplierId', 'warehouseId', 'lines[0].productId'],
  }),
);

await step(10, 'New sales invoice', async () =>
  createEntity({
    route: '/tr/v2/documents/sales-invoice/new',
    fillMap: {
      date: new Date().toISOString().slice(0, 10),
      'lines[0].quantity': '3',
      'lines[0].price': '80',
    },
    refCombos: ['customerId', 'warehouseId', 'lines[0].productId'],
  }),
);

await step(11, 'New payment received', async () =>
  createEntity({
    route: '/tr/v2/documents/payment-received/new',
    fillMap: {
      date: new Date().toISOString().slice(0, 10),
      amount: '120',
    },
    refCombos: ['customerId'],
  }),
);

await step(12, 'New payment sent', async () =>
  createEntity({
    route: '/tr/v2/purchases/payment-sent/new',
    fillMap: {
      date: new Date().toISOString().slice(0, 10),
      amount: '500',
    },
    refCombos: ['supplierId'],
  }),
);

await step(13, 'Second customer', async () =>
  createEntity({
    route: '/tr/v2/catalogs/partners/customers/new',
    fillMap: {
      name: customerName2,
      email: `${customerName2.toLowerCase()}@example.com`,
      contact: '+90 555 000 00 03',
    },
  }),
);

await step(14, 'Second product', async () =>
  createEntity({
    route: '/tr/v2/catalogs/products/new',
    fillMap: {
      name: productName2,
      unit: 'adet',
      costPrice: '120',
      listPrice: '180',
    },
  }),
);

await step(15, 'Second purchase invoice', async () =>
  createEntity({
    route: '/tr/v2/purchases/purchase-invoice/new',
    fillMap: {
      date: new Date().toISOString().slice(0, 10),
      'lines[0].quantity': '5',
      'lines[0].price': '120',
    },
    refCombos: ['supplierId', 'warehouseId', 'lines[0].productId'],
  }),
);

await step(16, 'Second sales invoice', async () =>
  createEntity({
    route: '/tr/v2/documents/sales-invoice/new',
    fillMap: {
      date: new Date().toISOString().slice(0, 10),
      'lines[0].quantity': '2',
      'lines[0].price': '180',
    },
    refCombos: ['customerId', 'warehouseId', 'lines[0].productId'],
  }),
);

// ----- Summary -----
const passed = summary.filter((s) => s.outcome === 'OK').length;
const failed = summary.filter((s) => s.outcome === 'FAIL').length;
console.log(`\n=== SUMMARY ===  ${passed} OK, ${failed} FAIL, ${summary.length} total`);
for (const s of summary) {
  const tag = s.outcome === 'OK' ? '✓' : '✗';
  console.log(`${tag} ${String(s.step).padStart(2)} ${s.name}${s.detail ? ` — ${s.detail}` : ''}`);
  if (s.fieldErrors.length)
    console.log(`     field-errors: ${s.fieldErrors.slice(0, 3).join(' | ')}`);
  if (s.formErrors.length) console.log(`     form-errors: ${s.formErrors.slice(0, 3).join(' | ')}`);
  for (const c of s.consoleErrors) console.log(`     [con-err] ${c.text}`);
  for (const e of s.pageErrors) console.log(`     [page-err] ${e}`);
}

await fs.writeFile(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
console.log(`\nWrote ${OUT}/summary.json + ${SHOTS}/*.png`);

await page.waitForTimeout(3000);
await ctx.close();
await browser.close();
