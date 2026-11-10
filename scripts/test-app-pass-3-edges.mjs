#!/usr/bin/env node
/**
 * Pass 3: negative tests + edge cases.
 * Validates that guards refuse bad input (insufficient stock, below-cost,
 * insufficient cash, missing required fields).
 */
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import { setupFixtures } from './test-app-setup.mjs';

loadEnv({ path: '.env.local' });

const BASE = 'http://localhost:3100';
const LOCALE = 'tr';
const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const results = [];
function record(name, ok, info = '') {
  results.push({ name, ok, info });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${info ? '  · ' + info : ''}`);
}

async function pickCombo(page, name, optionText) {
  const root = page.locator(`div.combobox:has(input[name="${name}"])`).first();
  await root.locator('button.combobox-trigger').click();
  await page.waitForTimeout(400);
  await page.locator('.combobox-popover .combobox-option', { hasText: optionText }).first().click();
  await page.waitForTimeout(200);
}

async function pickLineProduct(page, productText, rowIdx = 0) {
  const row = page.locator('table.v2-doc-lines tbody tr').nth(rowIdx);
  await row.locator('button.combobox-trigger').first().click();
  await page.waitForTimeout(400);
  await page
    .locator('.combobox-popover .combobox-option', { hasText: productText })
    .first()
    .click();
  await page.waitForTimeout(200);
}

async function fillLineField(page, suffix, value, rowIdx = 0) {
  const input = page
    .locator('table.v2-doc-lines tbody tr')
    .nth(rowIdx)
    .locator(`input[name$=".${suffix}"]`)
    .first();
  await input.fill(String(value));
  await input.press('Tab');
  await page.waitForTimeout(120);
}

async function fillIfPresent(page, sel, value) {
  if ((await page.locator(sel).count()) > 0) {
    await page.fill(sel, String(value));
    await page.waitForTimeout(100);
  }
}

async function selectIfPresent(page, sel, value) {
  if ((await page.locator(sel).count()) > 0) {
    await page.selectOption(sel, value).catch(() => {});
    await page.waitForTimeout(100);
  }
}

/** Attempt post and report whether it was blocked (negative test) or accepted.
 * Strategy: snapshot DOM error before click, then click, then wait for either:
 *  - URL change (away from /new) → posted
 *  - NEW error appears (different from pre-click snapshot) → blocked
 * Falls back to "did anything change" check after 15s.
 */
async function attemptPost(page) {
  const before = page.url();
  const errBefore = await page
    .locator('.form-error, .field-error')
    .first()
    .textContent()
    .catch(() => null);
  await page.getByRole('button', { name: /^Kaydet ve Posta Et$/ }).click();
  const start = Date.now();
  while (Date.now() - start < 15000) {
    const cur = page.url();
    if (cur !== before) return { posted: true };
    const err = await page
      .locator('.form-error, .field-error')
      .first()
      .textContent()
      .catch(() => null);
    if (err?.trim() && err.trim() !== (errBefore?.trim() ?? '')) {
      return { posted: false, error: err.trim() };
    }
    await page.waitForTimeout(300);
  }
  // Final URL check (some redirects beat the in-loop poll race)
  if (page.url() !== before) return { posted: true };
  return { posted: false, error: 'no response within 15s' };
}

async function main() {
  console.log('Pass 3 — seeding fixtures (clean slate)\n');
  const fx = await setupFixtures();
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${LOCALE}/v2/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });

  // ─── Edge 1: sell more than in stock (have 50, try 100) ────────────
  await edgeInsufficientStock();

  // ─── Edge 2: sell below cost in TRY ─────────────────────────────────
  await edgeBelowCost();

  // ─── Edge 3: sales-invoice with no lines ────────────────────────────
  await edgeNoLines();

  // ─── Edge 4: payment-sent more than kasa balance ────────────────────
  await edgeInsufficientCash();

  // ─── Edge 5: stock-transfer same warehouse ──────────────────────────
  await edgeStockTransferSameWarehouse();

  // ─── Edge 6: sale at exactly listPrice (TRY positive control) ───────
  await edgePositiveAtListPrice();

  await browser.close();

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n${pass} ✅ · ${fail} ❌ · toplam ${results.length}`);
  if (fail) {
    console.log('\nFailed:');
    for (const r of results.filter((r) => !r.ok)) console.log(`  ${r.name}  · ${r.info}`);
  }

  await db.$disconnect();

  // ── Scenarios ──────────────────────────────────────────────────────
  async function edgeInsufficientStock() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/sales-invoice/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'ABC');
    await pickCombo(page, 'warehouse', 'Ana Depo');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantity', 100); // we only have 50 seeded
    await fillLineField(page, 'price', 60000);
    const res = await attemptPost(page);
    record(
      'sell more than stock blocked',
      !res.posted && (res.error?.includes('Stock') || res.error?.includes('insufficient')),
      res.posted ? 'POSTED (should have been blocked)' : `blocked: ${res.error}`,
    );
  }

  async function edgeBelowCost() {
    // After insufficientStock test, no docs were posted. Need to seed cost
    // via stock-adjustment (post a real positive doc) so the avg cost > 0
    // then attempt to sell BELOW that cost.
    // Actually the +50 seed has totalCost = 50 × 20000 → avg cost = 20000 TRY.
    // So selling 1 unit at 19999 TRY should trigger belowCost.
    await page.goto(`${BASE}/${LOCALE}/v2/documents/sales-invoice/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'ABC');
    await pickCombo(page, 'warehouse', 'Ana Depo');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantity', 1);
    await fillLineField(page, 'price', 19999);
    const res = await attemptPost(page);
    record(
      'sell below cost (TRY 19999 < 20000) blocked',
      !res.posted && res.error?.toLowerCase().includes('cost'),
      res.posted ? 'POSTED (should have been blocked)' : `blocked: ${res.error}`,
    );
  }

  async function edgeNoLines() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/sales-invoice/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'ABC');
    await pickCombo(page, 'warehouse', 'Ana Depo');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    // Pick product on default row but leave quantity empty
    await pickLineProduct(page, 'Laptop X1');
    // quantity intentionally not filled
    const res = await attemptPost(page);
    record(
      'sales-invoice no quantity blocked',
      !res.posted,
      res.posted ? 'POSTED (should be blocked)' : `blocked: ${res.error}`,
    );
  }

  async function edgeInsufficientCash() {
    await page.goto(`${BASE}/${LOCALE}/v2/purchases/payment-sent/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'supplier', 'XYZ');
    await pickCombo(page, 'cashRegister', 'Ana Kasa TRY'); // opening 0
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    await fillIfPresent(page, 'input[name=amount]', '999999');
    const res = await attemptPost(page);
    record(
      'payment-sent over balance blocked',
      !res.posted && (res.error?.includes('INSUFFICIENT_CASH') || res.error?.includes('cash')),
      res.posted ? 'POSTED (should be blocked)' : `blocked: ${res.error}`,
    );
  }

  async function edgeStockTransferSameWarehouse() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/stock-transfer/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'sourceWarehouse', 'Ana Depo');
    await pickCombo(page, 'destinationWarehouse', 'Ana Depo'); // same
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantity', 1);
    const res = await attemptPost(page);
    record(
      'stock-transfer same warehouse blocked',
      !res.posted &&
        (res.error?.includes('WAREHOUSE_SAME') || res.error?.toLowerCase().includes('same')),
      res.posted ? 'POSTED (should be blocked)' : `blocked: ${res.error}`,
    );
  }

  async function edgePositiveAtListPrice() {
    // Positive control: sale at exactly the avg cost (20000) — should pass
    await page.goto(`${BASE}/${LOCALE}/v2/documents/sales-invoice/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'ABC');
    await pickCombo(page, 'warehouse', 'Ana Depo');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantity', 1);
    await fillLineField(page, 'price', 20001); // 1 kuruş above cost; Decimal-safe
    const res = await attemptPost(page);
    if (!res.posted) {
      await page.screenshot({ path: '/tmp/pass3-positive-fail.png', fullPage: true });
      // Dump any console errors
      console.log(
        '   ⚠ form html sample:',
        (
          await page
            .locator('form')
            .first()
            .innerHTML()
            .catch(() => '')
        ).slice(0, 600),
      );
    }
    record('sale 1 kuruş above cost (20001) accepted', res.posted, res.posted ? '' : res.error);
  }
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
