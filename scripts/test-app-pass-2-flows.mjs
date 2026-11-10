#!/usr/bin/env node
/**
 * Pass 2: per-document happy-path post tests.
 * Headless Playwright + DB verification after each post.
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

// ── Playwright helpers ────────────────────────────────────────────────
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
  await page.waitForTimeout(150);
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

async function tryPost(page, expectListUrl) {
  const before = page.url();
  await page.getByRole('button', { name: /^Kaydet ve Posta Et$/ }).click();
  try {
    await page.waitForURL((u) => u.toString() !== before && expectListUrl.test(u.toString()), {
      timeout: 12000,
    });
    return { ok: true };
  } catch {
    const err = await page
      .locator('.form-error, .field-error')
      .first()
      .textContent()
      .catch(() => null);
    return { ok: false, error: err?.trim() ?? 'no redirect, no error message captured' };
  }
}

// ── DB helpers ────────────────────────────────────────────────────────
async function lastDoc(model, tenantId) {
  return db[model].findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

async function stockNet(tenantId, warehouseId, productId) {
  const rows = await db.movement_inventory_stock_balance.findMany({
    where: { tenantId, warehouse: warehouseId, product: productId, active: true },
    select: { kind: true, quantity: true },
  });
  let n = 0;
  for (const r of rows) n += r.kind === 'income' ? r.quantity : -r.quantity;
  return n;
}

async function arNet(tenantId, customerId, currency) {
  const rows = await db.movement_sales_accounts_receivable.findMany({
    where: { tenantId, customer: customerId, active: true, currencyOriginal: currency },
    select: { kind: true, amountOriginal: true },
  });
  let n = 0;
  for (const r of rows) {
    const a = Number(r.amountOriginal ?? 0);
    n += r.kind === 'income' ? a : -a;
  }
  return n;
}

async function apNet(tenantId, supplierId, currency) {
  const rows = await db.movement_purchases_accounts_payable.findMany({
    where: { tenantId, supplier: supplierId, active: true, currencyOriginal: currency },
    select: { kind: true, amountOriginal: true },
  });
  let n = 0;
  for (const r of rows) {
    const a = Number(r.amountOriginal ?? 0);
    n += r.kind === 'income' ? a : -a;
  }
  return n;
}

// ── Pass 2 main ───────────────────────────────────────────────────────
async function main() {
  console.log('Pass 2 — seeding fixtures (truncate + catalog inserts)\n');
  const fx = await setupFixtures();
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Warmup dev-bypass
  await page.goto(`${BASE}/${LOCALE}/v2/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(500);

  console.log('— TIER 1: critical operational flows —\n');

  // Initial stock (+50) is now seeded by setupFixtures. Stock-adjustment is
  // tested as a +5 delta in addition to that.
  await runStockAdjustmentIncome();
  // 1) purchase-invoice RUB: 10 × 50000 RUB at fxRate=0.40
  await runPurchaseInvoiceRUB();
  // 2) payment-sent (settle XYZ AP in RUB)
  await runPaymentSentRUB();
  // 3) sales-invoice TRY: 2 × 60000 TRY to ABC
  await runSalesInvoiceTRY();
  // 4) payment-received TRY (settle ABC AR)
  await runPaymentReceivedTRY();
  // 5) sales-invoice USD: 2 × 1900 USD to Pacific (multi-currency, tests belowCost fix)
  await runSalesInvoiceUSD();
  // 6) payment-received USD (settle Pacific AR USD at same rate)
  await runPaymentReceivedUSD();
  // 7) return-invoice (ABC returns 1 unit)
  await runReturnInvoice();
  // 8) refund-payment (cash refund to ABC)
  await runRefundPayment();
  // 9) return-purchase (return 2 units to XYZ in RUB)
  await runReturnPurchase();
  // 10) stock-transfer (Ana → Şube, 3 units)
  await runStockTransfer();
  // 11) inventory-count (declare counted quantities at Şube)
  await runInventoryCount();
  // 12) price-setting (set TRY price)
  await runPriceSetting();
  // 13) cash-transfer (Ana Kasa TRY → another TRY kasa — needs 2 TRY kasalar; skip if not feasible)

  console.log('\n— TIER 2: bank flows —\n');
  // 14) bank-deposit (cash Ana Kasa → bank TRY)
  await runBankDeposit();
  // 15) bank-withdrawal (bank TRY → kasa TRY)
  await runBankWithdrawal();
  // 16) bank-receipt (USD payment from Pacific into USD bank)
  await runBankReceipt();
  // 17) bank-payment (bank TRY → supplier in TRY, just to exercise the form)
  await runBankPayment();

  await browser.close();

  // Summary
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n${pass} ✅ · ${fail} ❌ · toplam ${results.length}`);
  if (fail) {
    console.log('\nFailed:');
    for (const r of results.filter((r) => !r.ok)) console.log(`  ${r.name}  · ${r.info}`);
  }

  await db.$disconnect();

  // ── Scenarios ──────────────────────────────────────────────────────
  async function runStockAdjustmentIncome() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/stock-adjustment/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'warehouse', 'Ana Depo');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantityDelta', 5);
    await fillLineField(page, 'unitCost', 20000);
    const res = await tryPost(page, /\/v2\/documents\/stock-adjustment(\/|$)/);
    if (!res.ok) return record('stock-adjustment +5 delta', false, res.error);
    const stock = await stockNet(fx.tenantId, fx.warehouseAnaId, fx.productId);
    record('stock-adjustment +5 (50 seed +5)', stock >= 55, `stock=${stock}`);
  }

  async function runPurchaseInvoiceRUB() {
    await page.goto(`${BASE}/${LOCALE}/v2/purchases/purchase-invoice/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'supplier', 'XYZ');
    await pickCombo(page, 'warehouse', 'Ana Depo');
    await selectIfPresent(page, 'select[name=currency]', 'RUB');
    await fillIfPresent(page, 'input[name=fxRate]', '0.40');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantity', 10);
    await fillLineField(page, 'price', 50000);
    const res = await tryPost(page, /\/v2\/purchases\/purchase-invoice(\/|$)/);
    if (!res.ok) return record('purchase-invoice RUB', false, res.error);
    const ap = await apNet(fx.tenantId, fx.supplierId, 'RUB');
    record('purchase-invoice RUB → AP=500000', ap === 500000, `AP_RUB=${ap}`);
  }

  async function runPaymentSentRUB() {
    await page.goto(`${BASE}/${LOCALE}/v2/purchases/payment-sent/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'supplier', 'XYZ');
    await pickCombo(page, 'cashRegister', 'Kasa RUB');
    await selectIfPresent(page, 'select[name=currency]', 'RUB');
    await fillIfPresent(page, 'input[name=fxRate]', '0.40');
    await fillIfPresent(page, 'input[name=amount]', '500000');
    const res = await tryPost(page, /\/v2\/purchases\/payment-sent(\/|$)/);
    if (!res.ok) return record('payment-sent RUB', false, res.error);
    const ap = await apNet(fx.tenantId, fx.supplierId, 'RUB');
    record('payment-sent → AP_RUB=0', ap === 0, `AP_RUB=${ap}`);
  }

  async function runSalesInvoiceTRY() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/sales-invoice/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'ABC');
    await pickCombo(page, 'warehouse', 'Ana Depo');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantity', 2);
    await fillLineField(page, 'price', 60000);
    const res = await tryPost(page, /\/v2\/documents\/sales-invoice(\/|$)/);
    if (!res.ok) return record('sales-invoice TRY', false, res.error);
    const ar = await arNet(fx.tenantId, fx.customer1Id, 'TRY');
    record('sales-invoice TRY → AR=120000', ar === 120000, `AR_TRY=${ar}`);
  }

  async function runPaymentReceivedTRY() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/payment-received/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'ABC');
    await pickCombo(page, 'cashRegister', 'Ana Kasa TRY');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    await fillIfPresent(page, 'input[name=amount]', '120000');
    const res = await tryPost(page, /\/v2\/documents\/payment-received(\/|$)/);
    if (!res.ok) return record('payment-received TRY', false, res.error);
    const ar = await arNet(fx.tenantId, fx.customer1Id, 'TRY');
    record('payment-received → AR_TRY=0', ar === 0, `AR_TRY=${ar}`);
  }

  async function runSalesInvoiceUSD() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/sales-invoice/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'Pacific');
    await pickCombo(page, 'warehouse', 'Ana Depo');
    await selectIfPresent(page, 'select[name=currency]', 'USD');
    await fillIfPresent(page, 'input[name=fxRate]', '32');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantity', 2);
    await fillLineField(page, 'price', 1900);
    const res = await tryPost(page, /\/v2\/documents\/sales-invoice(\/|$)/);
    if (!res.ok) return record('sales-invoice USD', false, res.error);
    const ar = await arNet(fx.tenantId, fx.customer2Id, 'USD');
    record('sales-invoice USD → AR=3800', ar === 3800, `AR_USD=${ar}`);
  }

  async function runPaymentReceivedUSD() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/payment-received/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'Pacific');
    await pickCombo(page, 'cashRegister', 'Kasa USD');
    await selectIfPresent(page, 'select[name=currency]', 'USD');
    await fillIfPresent(page, 'input[name=fxRate]', '32');
    await fillIfPresent(page, 'input[name=amount]', '3800');
    const res = await tryPost(page, /\/v2\/documents\/payment-received(\/|$)/);
    if (!res.ok) return record('payment-received USD', false, res.error);
    const ar = await arNet(fx.tenantId, fx.customer2Id, 'USD');
    record('payment-received USD → AR_USD=0', ar === 0, `AR_USD=${ar}`);
  }

  async function runReturnInvoice() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/return-invoice/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'ABC');
    await pickCombo(page, 'warehouse', 'Ana Depo');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantity', 1);
    await fillLineField(page, 'price', 60000);
    const res = await tryPost(page, /\/v2\/documents\/return-invoice(\/|$)/);
    if (!res.ok) return record('return-invoice', false, res.error);
    // ABC AR should be -60000 (customer is now owed back 60000 TRY)
    const ar = await arNet(fx.tenantId, fx.customer1Id, 'TRY');
    record('return-invoice → ABC AR_TRY = -60000 (we owe customer)', ar === -60000, `AR_TRY=${ar}`);
  }

  async function runRefundPayment() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/refund-payment/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'ABC');
    await pickCombo(page, 'cashRegister', 'Ana Kasa TRY');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    await fillIfPresent(page, 'input[name=amount]', '60000');
    const res = await tryPost(page, /\/v2\/documents\/refund-payment(\/|$)/);
    if (!res.ok) return record('refund-payment', false, res.error);
    const ar = await arNet(fx.tenantId, fx.customer1Id, 'TRY');
    record('refund-payment → ABC AR_TRY=0', ar === 0, `AR_TRY=${ar}`);
  }

  async function runReturnPurchase() {
    await page.goto(`${BASE}/${LOCALE}/v2/purchases/return-purchase/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'supplier', 'XYZ');
    await pickCombo(page, 'warehouse', 'Ana Depo');
    await selectIfPresent(page, 'select[name=currency]', 'RUB');
    await fillIfPresent(page, 'input[name=fxRate]', '0.40');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantity', 2);
    await fillLineField(page, 'price', 50000);
    const res = await tryPost(page, /\/v2\/purchases\/return-purchase(\/|$)/);
    if (!res.ok) return record('return-purchase', false, res.error);
    record('return-purchase posted', true);
  }

  async function runStockTransfer() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/stock-transfer/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'sourceWarehouse', 'Ana Depo');
    await pickCombo(page, 'destinationWarehouse', 'Şube Depo');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'quantity', 3);
    const res = await tryPost(page, /\/v2\/documents\/stock-transfer(\/|$)/);
    if (!res.ok) return record('stock-transfer', false, res.error);
    const sube = await stockNet(fx.tenantId, fx.warehouseSubeId, fx.productId);
    record('stock-transfer → Şube=3', sube === 3, `Şube=${sube}`);
  }

  async function runInventoryCount() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/inventory-count/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'warehouse', 'Şube Depo');
    await selectIfPresent(page, 'select[name=countStatus]', 'counted');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'expectedQuantity', 3);
    await fillLineField(page, 'countedQuantity', 3);
    const res = await tryPost(page, /\/v2\/documents\/inventory-count(\/|$)/);
    record('inventory-count posted (match)', res.ok, res.ok ? '' : res.error);
  }

  async function runPriceSetting() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/price-setting/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'priceType', 'Liste TRY');
    await pickLineProduct(page, 'Laptop X1');
    await fillLineField(page, 'price', 70000);
    const res = await tryPost(page, /\/v2\/documents\/price-setting(\/|$)/);
    record('price-setting posted (Liste TRY @70000)', res.ok, res.ok ? '' : res.error);
  }

  async function runBankDeposit() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/bank-deposit/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'cashRegister', 'Ana Kasa TRY');
    await pickCombo(page, 'bankAccount', 'Banka TRY');
    await fillIfPresent(page, 'input[name=amount]', '50000');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    const res = await tryPost(page, /\/v2\/documents\/bank-deposit(\/|$)/);
    record('bank-deposit', res.ok, res.ok ? '' : res.error);
  }

  async function runBankWithdrawal() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/bank-withdrawal/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'bankAccount', 'Banka TRY');
    await pickCombo(page, 'cashRegister', 'Ana Kasa TRY');
    await fillIfPresent(page, 'input[name=amount]', '10000');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    const res = await tryPost(page, /\/v2\/documents\/bank-withdrawal(\/|$)/);
    record('bank-withdrawal', res.ok, res.ok ? '' : res.error);
  }

  async function runBankReceipt() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/bank-receipt/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'customer', 'Pacific');
    await pickCombo(page, 'bankAccount', 'Banka USD');
    await selectIfPresent(page, 'select[name=currency]', 'USD');
    await fillIfPresent(page, 'input[name=fxRate]', '32');
    await fillIfPresent(page, 'input[name=amount]', '500');
    const res = await tryPost(page, /\/v2\/documents\/bank-receipt(\/|$)/);
    record('bank-receipt USD', res.ok, res.ok ? '' : res.error);
  }

  async function runBankPayment() {
    await page.goto(`${BASE}/${LOCALE}/v2/documents/bank-payment/new`, {
      waitUntil: 'networkidle',
    });
    await pickCombo(page, 'supplier', 'XYZ');
    await pickCombo(page, 'bankAccount', 'Banka TRY');
    await selectIfPresent(page, 'select[name=currency]', 'TRY');
    await fillIfPresent(page, 'input[name=fxRate]', '1');
    await fillIfPresent(page, 'input[name=amount]', '5000');
    const res = await tryPost(page, /\/v2\/documents\/bank-payment(\/|$)/);
    record('bank-payment TRY', res.ok, res.ok ? '' : res.error);
  }
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
