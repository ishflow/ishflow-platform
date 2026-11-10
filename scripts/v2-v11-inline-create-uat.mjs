import fs from 'node:fs/promises';
// V0.11 UAT — verify inline kategori/grup create works on /v2/catalogs/products/new.
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-v11-uat';
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

// Pick a unique name suffix so reruns don't collide on @@unique.
const suffix = Date.now().toString(36).slice(-6);
const newCatName = `UAT-Cat-${suffix}`;
const newGrpName = `UAT-Grp-${suffix}`;

await expect(
  'product /new shows "Yeni kategori oluştur" CTA inside Kategori combobox',
  async () => {
    await page.goto(`${BASE}/tr/v2/catalogs/products/new`, { waitUntil: 'networkidle' });
    // The Kategori trigger is the FIRST combobox-trigger on the page (after Ad).
    // Use label association by clicking near the "Kategori" label.
    const triggers = page.locator('button.combobox-trigger');
    const c = await triggers.count();
    if (c < 1) throw new Error('No combobox-trigger found.');
    // Find the trigger whose visible label matches the Kategori placeholder.
    await triggers.filter({ hasText: 'Kategori seç' }).first().click();
    await page.locator('.combobox-popover').first().waitFor({ state: 'visible' });
    const cta = await page
      .locator('.combobox-popover .combobox-option-create')
      .first()
      .textContent();
    if (!cta || !cta.includes('Yeni kategori oluştur')) {
      throw new Error(`CTA missing. Got: "${cta?.trim()}"`);
    }
  },
);

await expect('clicking CTA swaps popover to inline name input', async () => {
  await page.locator('.combobox-popover .combobox-option-create').first().click();
  await page.locator('.combobox-popover .combobox-create-input').first().waitFor({
    state: 'visible',
  });
});

await expect(`inline create category "${newCatName}" → selects it on trigger`, async () => {
  const input = page.locator('.combobox-popover .combobox-create-input').first();
  await input.fill(newCatName);
  await page.locator('.combobox-popover .combobox-create-actions .btn-primary').first().click();
  // After success, popover closes and the trigger label updates.
  await page.waitForTimeout(1500);
  const triggers = page.locator('button.combobox-trigger');
  const catTrigger = triggers.nth(0); // Kategori is first
  const txt = (await catTrigger.textContent()) ?? '';
  if (!txt.includes(newCatName)) {
    throw new Error(`Trigger label should be "${newCatName}", got "${txt.trim()}"`);
  }
});

await expect('product /new shows "Yeni grup oluştur" CTA inside Grup combobox', async () => {
  // Group trigger is the SECOND combobox.
  const groupTrigger = page
    .locator('button.combobox-trigger')
    .filter({ hasText: 'Grup seç' })
    .first();
  await groupTrigger.click();
  await page.locator('.combobox-popover').last().waitFor({ state: 'visible' });
  const cta = await page.locator('.combobox-popover .combobox-option-create').last().textContent();
  if (!cta || !cta.includes('Yeni grup oluştur')) {
    throw new Error(`CTA missing. Got: "${cta?.trim()}"`);
  }
});

await expect(`inline create group "${newGrpName}" → selects it on trigger`, async () => {
  await page.locator('.combobox-popover .combobox-option-create').last().click();
  const input = page.locator('.combobox-popover .combobox-create-input').last();
  await input.waitFor({ state: 'visible' });
  await input.fill(newGrpName);
  await page.locator('.combobox-popover .combobox-create-actions .btn-primary').last().click();
  await page.waitForTimeout(1500);
  // Check the second combobox trigger label.
  const txt = (await page.locator('button.combobox-trigger').nth(1).textContent()) ?? '';
  if (!txt.includes(newGrpName)) {
    throw new Error(`Group trigger should be "${newGrpName}", got "${txt.trim()}"`);
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
