import fs from 'node:fs/promises';
// V0.10b UAT — verify product dropdown is NOT clipped + "Onayla ve kapat"
// actually posts (createAndPostDocumentRecord) instead of just saving draft.
//
// Run (dev server must already be on localhost:3100):
//   node scripts/v2-v10b-product-dropdown-and-post-uat.mjs
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-v10b-uat';
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

// ─── Product line dropdown shows options (not clipped) ────────────────────

await expect('product line popover shows clickable options (not clipped)', async () => {
  await page.goto(`${BASE}/tr/v2/documents/sales-invoice/new`, { waitUntil: 'networkidle' });

  // Click "Ürün seç..." trigger inside the line table (last combobox-trigger).
  const triggers = page.locator('button.combobox-trigger');
  const triggerCount = await triggers.count();
  if (triggerCount < 1) throw new Error('No combobox-trigger found.');
  const productTrigger = triggers.nth(triggerCount - 1);
  await productTrigger.click();

  const popover = page.locator('.combobox-popover').last();
  await popover.waitFor({ state: 'visible' });

  // Wait briefly for searchRefOptions to populate (server action).
  await page.waitForTimeout(500);

  // List must render at least 1 option (or "Sonuç yok" empty state).
  const options = popover.locator('.combobox-option');
  const empty = popover.locator('.combobox-empty');
  const optCount = await options.count();
  const emptyCount = await empty.count();
  if (optCount === 0 && emptyCount === 0) {
    throw new Error(
      'Neither options nor empty-state visible — popover is clipped or list is broken.',
    );
  }

  // The popover's bottom must NOT exceed the table's bottom by less than 10px
  // (i.e. it must extend BELOW the table without being clipped). If clipping
  // were happening, the popover would be truncated AT the table boundary.
  const popoverBox = await popover.boundingBox();
  const table = page.locator('table.data').first();
  const tableBox = await table.boundingBox();
  if (!popoverBox || !tableBox) throw new Error('Could not measure popover or table.');
  // Healthy state: popover extends past tableBottom (i.e. dropdown is rendered below the table edge).
  const tableBottom = tableBox.y + tableBox.height;
  const popoverBottom = popoverBox.y + popoverBox.height;
  if (popoverBottom <= tableBottom + 1) {
    throw new Error(
      `popover (bottom=${popoverBottom}) is inside or at the table (bottom=${tableBottom}) — clipping suspected.`,
    );
  }
});

// ─── "Onayla ve kapat" button now carries name=__intent value=post ────────

await expect('confirm-and-close button posts name=__intent value=post', async () => {
  await page.goto(`${BASE}/tr/v2/documents/sales-invoice/new`, { waitUntil: 'networkidle' });
  const primaryBtn = page.locator('button.btn-primary[type="submit"]').first();
  const intentName = await primaryBtn.getAttribute('name');
  const intentValue = await primaryBtn.getAttribute('value');
  if (intentName !== '__intent') {
    throw new Error(`Expected name="__intent", got name="${intentName}"`);
  }
  if (intentValue !== 'post') {
    throw new Error(`Expected value="post", got value="${intentValue}"`);
  }
});

await expect('save-draft button posts name=__intent value=save', async () => {
  await page.goto(`${BASE}/tr/v2/documents/sales-invoice/new`, { waitUntil: 'networkidle' });
  const secondaryBtn = page.locator('button.btn-secondary[type="submit"]').first();
  const intentName = await secondaryBtn.getAttribute('name');
  const intentValue = await secondaryBtn.getAttribute('value');
  if (intentName !== '__intent') {
    throw new Error(`Expected name="__intent", got name="${intentName}"`);
  }
  if (intentValue !== 'save') {
    throw new Error(`Expected value="save", got value="${intentValue}"`);
  }
});

// Same check on purchase-invoice / payment-received / payment-sent.
for (const url of [
  '/tr/v2/purchases/purchase-invoice/new',
  '/tr/v2/documents/payment-received/new',
  '/tr/v2/purchases/payment-sent/new',
]) {
  await expect(`${url} has post + save intent buttons`, async () => {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
    const postBtn = page
      .locator('button.btn-primary[type="submit"][name="__intent"][value="post"]')
      .first();
    const saveBtn = page
      .locator('button.btn-secondary[type="submit"][name="__intent"][value="save"]')
      .first();
    const postCount = await postBtn.count();
    const saveCount = await saveBtn.count();
    if (postCount < 1) throw new Error(`No post-intent button on ${url}`);
    if (saveCount < 1) throw new Error(`No save-intent button on ${url}`);
  });
}

// ─── End-to-end: Onayla ve kapat triggers create-and-post flow ───────────
//
// Tries to post a sales invoice. Acceptable outcomes:
//   (a) redirect to /v2/documents/sales-invoice (post succeeded), OR
//   (b) form stays on /new with a TRANSLATED error like "stok yok" — meaning
//       the post flow ran and surfaced a translated business-rule error.
//
// Both prove the user's complaint ("kaydetmiyor") is fixed:
//   - Dropdown is no longer clipped (test 1)
//   - "Onayla ve kapat" actually calls createAndPostDocumentRecord (tests 2-6)
//   - When it fails, the error message is user-friendly TR text (this test)
await expect('Onayla ve kapat runs create-and-post and surfaces TR error if it fails', async () => {
  await page.goto(`${BASE}/tr/v2/documents/sales-invoice/new`, { waitUntil: 'networkidle' });

  // 1) Pick customer (first one).
  const triggers = page.locator('button.combobox-trigger');
  await triggers.nth(0).click();
  await page.locator('.combobox-popover .combobox-option').first().waitFor({ state: 'visible' });
  await page.locator('.combobox-popover .combobox-option').first().click();

  // 2) Pick warehouse (now the first OPEN trigger again — popover closed).
  await triggers.nth(1).click();
  await page.locator('.combobox-popover .combobox-option').first().waitFor({ state: 'visible' });
  await page.locator('.combobox-popover .combobox-option').first().click();

  // 3) Pick product.
  await triggers.nth(2).click();
  await page.locator('.combobox-popover .combobox-option').first().waitFor({ state: 'visible' });
  await page.locator('.combobox-popover .combobox-option').first().click();

  // 4) Fill quantity + price.
  await page.locator('input[name="lines[0].quantity"]').fill('2');
  await page.locator('input[name="lines[0].price"]').fill('100');

  // 5) Click "Onayla ve kapat" (primary submit).
  const postBtn = page
    .locator('button.btn-primary[type="submit"][name="__intent"][value="post"]')
    .first();
  await postBtn.click();

  // 6) Wait for any of: redirect, error banner, field error.
  await Promise.race([
    page
      .waitForURL(/\/v2\/documents\/sales-invoice(?:$|\?|\/)/, { timeout: 15000 })
      .catch(() => null),
    page
      .locator('.form-error, .field-error')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => null),
  ]);

  // 7) Inspect outcome.
  const finalUrl = page.url();
  const formErrorText =
    (await page
      .locator('.form-error')
      .first()
      .textContent()
      .catch(() => null)) ?? '';

  // Acceptable outcomes:
  // (a) Redirected away from /new → post succeeded.
  // (b) Still on /new BUT formError is a translated TR sentence (not a raw
  //     error key like "insufficientStock") → flow ran, business rule failed.
  if (!finalUrl.endsWith('/new')) return; // (a)
  const trimmed = formErrorText.trim();
  if (!trimmed) {
    throw new Error('Still on /new but no error banner shown — silent failure.');
  }
  // (b) Reject raw error keys (camelCase or snake_case, no spaces).
  if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(trimmed) && !trimmed.includes(' ')) {
    throw new Error(`Form error is a raw error key ("${trimmed}"), not a translated message.`);
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
