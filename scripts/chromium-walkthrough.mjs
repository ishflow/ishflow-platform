// chromium-walkthrough.mjs
//
// Real-customer flow, played out in a visible Chromium window. The script
// proves the 1C-canonical pricing chain:
//
//   1. Create dynamic price types (markup % over avg cost, no static base)
//   2. Create customers, each assigned a default price type
//   3. Create a product WITHOUT a list price (cost discovered via purchase)
//   4. Purchase-invoice → product avg cost lands
//   5. Sales-invoice → line price auto-fills from customer's price type
//   6. Payment received → kasa balance updates in kasa's own currency
//
// Run: node scripts/chromium-walkthrough.mjs
//   PWHEAD=0  → headless (CI / quick run)
//   default   → headed (visible window)

import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const BASE_URL = process.env.WALKTHROUGH_BASE_URL ?? 'http://localhost:3100';
const LOCALE = 'tr';
const HEADED = process.env.PWHEAD !== '0';
const STEP = HEADED ? 800 : 50; // pause for the human eye

const TENANT_ID = '00000000-0000-0000-0000-000000d3b001';

const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const results = [];

function line(msg = '') {
  console.log(msg);
}
function header(title) {
  line('');
  line(`━━━━━━━━━━ ${title} ━━━━━━━━━━`);
}
function record(name, ok, info = '') {
  results.push({ name, ok, info });
  line(`   ${ok ? '✅' : '❌'} ${name}${info ? `  ${info}` : ''}`);
}
function check(name, expected, actual) {
  const ok = Number(expected) === Number(actual);
  record(name, ok, `exp=${expected}  act=${actual}`);
}

async function setupBaseline() {
  header('0 — temiz başlangıç (truncate + setup-fixtures)');
  // Lean on the existing setup script (truncate + tenant + FX + currencies +
  // 2 warehouses + 2 customers + 1 supplier + 3 kasalar + 2 banks).
  // We override: (a) product seeded WITHOUT listPrice + WITHOUT stock,
  // (b) NO opening price type, since this run creates them through the UI.
  const { execSync } = await import('node:child_process');
  execSync('node scripts/test-app-setup.mjs', { stdio: 'inherit' });
  // Strip listPrice + stock seed + default price type so the script starts
  // from a "I have nothing" state.
  await db.catalog_inventory_product.updateMany({
    where: { tenantId: TENANT_ID },
    data: { listPrice: null },
  });
  await db.movement_inventory_stock_balance.deleteMany({
    where: { tenantId: TENANT_ID, docType: 'setup.opening' },
  });
  // Drop the test-app-setup default static price type so we start clean.
  await db.catalog_sales_price_type.deleteMany({ where: { tenantId: TENANT_ID } });
  // Drop the customers — we'll re-create them through the UI so the
  // customer-form price-type chip is verified end-to-end.
  await db.catalog_sales_customer.deleteMany({ where: { tenantId: TENANT_ID } });
  line('[walkthrough] baseline reset: no list price, no stock, no price types, no customers');
}

async function pickComboboxByName(page, name, label) {
  // RefCombobox shell:
  //   <div class="combobox">
  //     <input type="hidden" name="<fieldName>" value=""/>
  //     <button class="combobox-trigger">…
  //     <div class="combobox-popover">
  //       <div class="combobox-search"><input/></div>
  //       <button class="combobox-option">…
  // Click trigger → type search → click option.
  const root = page.locator(`div.combobox:has(input[name="${name}"])`).first();
  const trigger = root.locator('button.combobox-trigger');
  await trigger.waitFor({ state: 'visible', timeout: 10000 });
  await trigger.click();
  await page.waitForTimeout(500);
  const search = root.locator('.combobox-search input').first();
  if ((await search.count()) > 0) {
    await search.fill(label.slice(0, Math.min(label.length, 8)));
    await page.waitForTimeout(700); // debounced fetch
  }
  const option = root.locator('button.combobox-option').filter({ hasText: label }).first();
  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.click();
  await page.waitForTimeout(400);
}

async function pickLineProduct(page, label, rowIdx = 0) {
  const row = page.locator('table.v2-doc-lines tbody tr').nth(rowIdx);
  const trigger = row.locator('button.combobox-trigger').first();
  await trigger.waitFor({ state: 'visible', timeout: 10000 });
  await trigger.click();
  await page.waitForTimeout(500);
  const search = row.locator('.combobox-search input').first();
  if ((await search.count()) > 0) {
    await search.fill(label.slice(0, Math.min(label.length, 8)));
    await page.waitForTimeout(700);
  }
  const option = row.locator('button.combobox-option').filter({ hasText: label }).first();
  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.click();
  await page.waitForTimeout(700);
}

async function fillLineField(page, suffix, value, rowIdx = 0) {
  const input = page
    .locator('table.v2-doc-lines tbody tr')
    .nth(rowIdx)
    .locator(`input[name$=".${suffix}"]`)
    .first();
  await input.click();
  await input.fill(String(value));
  await input.blur();
  await page.waitForTimeout(STEP);
}

async function tryPost(page, urlRe) {
  // V2 doc forms expose two CTAs: "Kaydet" (save draft) and
  // "Kaydet ve Posta Et" (save + post). We always want the latter.
  const post = page.getByRole('button', { name: /Kaydet ve Posta/i }).first();
  await post.waitFor({ state: 'visible', timeout: 15000 });
  await post.click();
  try {
    await page.waitForURL((u) => !u.toString().endsWith('/new') && urlRe.test(u.toString()), {
      timeout: 20000,
    });
    return { ok: true };
  } catch {
    const errText = await page
      .locator('[data-v2-error], .text-destructive, .text-red-500')
      .first()
      .textContent()
      .catch(() => '');
    return { ok: false, error: errText ?? 'no posted, no error visible' };
  }
}

async function main() {
  await setupBaseline();
  const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 200 : 0 });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => line(`   [pageerr] ${e.message}`));

  // Warm dev-bypass
  await page.goto(`${BASE_URL}/${LOCALE}/v2/dashboard`, { waitUntil: 'networkidle' });

  // ─── 1: Fiyat türleri oluştur ────────────────────────────────────────
  header('1 — Önce fiyat türlerini oluştur (ÜRÜNDEN ÖNCE, MÜŞTERİDEN ÖNCE)');
  const priceTypes = [
    { name: 'Toptan +10%', kind: 'dynamic', markupPct: 0.1, isDefault: false },
    { name: 'Perakende +30%', kind: 'dynamic', markupPct: 0.3, isDefault: true },
  ];
  for (const pt of priceTypes) {
    const markupPctDisplay = Math.round(pt.markupPct * 100); // percentFraction transform expects %
    line(`   · ${pt.name}  (kind=${pt.kind}, markup=${markupPctDisplay}%)`);
    await page.goto(`${BASE_URL}/${LOCALE}/v2/catalogs/price-types/new`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(STEP);
    await page.fill('input[name=name]', pt.name);
    // kind = dynamic → triggers showIf on markupPct + basePriceType
    await page.selectOption('select[name=kind]', pt.kind);
    await page.waitForTimeout(STEP * 2);
    // markupPct: number input with transform=percentFraction → enter percent (10)
    const markupInput = page.locator('input[name=markupPct]').first();
    await markupInput.waitFor({ state: 'visible', timeout: 5000 });
    await markupInput.click();
    await markupInput.fill(String(markupPctDisplay));
    await markupInput.blur();
    await page.waitForTimeout(STEP);
    await page
      .getByRole('button', { name: /Kaydet/i })
      .first()
      .click();
    await page.waitForTimeout(2500);
    if (page.url().endsWith('/new')) {
      const err = await page
        .locator('[data-v2-error], .text-destructive, .text-red-500')
        .first()
        .textContent()
        .catch(() => '');
      record(`fiyat türü kaydı: ${pt.name}`, false, err ?? 'no navigation');
      continue;
    }
    await page.waitForTimeout(STEP);
  }
  // Mark Perakende as tenant default
  const perakende = await db.catalog_sales_price_type.findFirst({
    where: { tenantId: TENANT_ID, name: 'Perakende +30%' },
  });
  if (perakende) {
    await db.catalog_sales_price_type.update({
      where: { id: perakende.id },
      data: { isDefault: true },
    });
  }
  const ptCount = await db.catalog_sales_price_type.count({ where: { tenantId: TENANT_ID } });
  check('Fiyat türü sayısı', 2, ptCount);

  // ─── 2: Müşterileri oluştur — fiyat türüyle birlikte ────────────────
  header('2 — Müşterileri oluştur, her birine fiyat türü ata');
  const customers = [
    { code: 'C-001', name: 'ABC Ticaret A.Ş.', priceType: 'Toptan +10%' },
    { code: 'C-002', name: 'Pacific Trade LLC', priceType: 'Perakende +30%' },
  ];
  for (const c of customers) {
    line(`   · ${c.name}  →  ${c.priceType}`);
    await page.goto(`${BASE_URL}/${LOCALE}/v2/catalogs/partners/customers/new`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(STEP);
    await page.fill('input[name=name]', c.name);
    await page.waitForTimeout(STEP);
    await pickComboboxByName(page, 'defaultPriceType', c.priceType);
    await page.waitForTimeout(STEP);
    await Promise.all([
      page
        .waitForURL((url) => !url.toString().endsWith('/new'), { timeout: 12000 })
        .catch(() => {}),
      page
        .getByRole('button', { name: /Kaydet/i })
        .first()
        .click(),
    ]);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(STEP);
  }
  const custCount = await db.catalog_sales_customer.count({
    where: { tenantId: TENANT_ID, deletedAt: null },
  });
  check('Müşteri sayısı', 2, custCount);
  // Verify priceType linkage at DB level
  const abc = await db.catalog_sales_customer.findFirst({
    where: { tenantId: TENANT_ID, name: 'ABC Ticaret A.Ş.' },
    select: { id: true, defaultPriceType: true },
  });
  record(
    'ABC → fiyat türü atanmış',
    Boolean(abc?.defaultPriceType),
    abc?.defaultPriceType ? 'linked' : 'NULL',
  );

  // ─── 3: ALIŞ — XYZ tedarikçiden 10 Laptop X1 @ 18.000 TRY ───────────
  header('3 — Alış faturası: 10× Laptop X1 @ 18.000 TRY (maliyet kaynağı)');
  const supplier = await db.catalog_purchases_supplier.findFirst({
    where: { tenantId: TENANT_ID },
  });
  await page.goto(`${BASE_URL}/${LOCALE}/v2/purchases/purchase-invoice/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(STEP);
  await pickComboboxByName(page, 'supplier', supplier.name);
  await pickComboboxByName(page, 'warehouse', 'Ana Depo');
  await page.selectOption('select[name=currency]', 'TRY').catch(() => {});
  await page.fill('input[name=fxRate]', '1').catch(() => {});
  await page.waitForTimeout(STEP);
  await pickLineProduct(page, 'Laptop X1', 0);
  await fillLineField(page, 'quantity', 10);
  await fillLineField(page, 'price', 18000);
  const purchaseRes = await tryPost(page, /\/v2\/purchases\/purchase-invoice(\/|$)/);
  record('Alış faturası geçti', purchaseRes.ok, purchaseRes.ok ? '' : purchaseRes.error);

  // ─── 4: SATIŞ — ABC (Toptan +10%) → 2× Laptop X1, fiyat otomatik ───
  header('4 — Satış: ABC (Toptan +10%) 2× Laptop → otomatik fiyat (18000×1.10=19800)');
  await page.goto(`${BASE_URL}/${LOCALE}/v2/documents/sales-invoice/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(STEP);
  await pickComboboxByName(page, 'customer', 'ABC Ticaret');
  await page.waitForTimeout(STEP * 2); // priceType auto-fill
  await pickComboboxByName(page, 'warehouse', 'Ana Depo');
  await page.selectOption('select[name=currency]', 'TRY').catch(() => {});
  await page.fill('input[name=fxRate]', '1').catch(() => {});
  await pickLineProduct(page, 'Laptop X1', 0);
  await page.waitForTimeout(STEP * 2); // resolveLinePrice tick
  // Read what the form put in the price box
  const lineAutoPrice = await page
    .locator('table.v2-doc-lines tbody tr')
    .nth(0)
    .locator('input[name$=".price"]')
    .first()
    .inputValue();
  record('ABC line.price otomatik dolmuş', Number(lineAutoPrice) > 0, `price=${lineAutoPrice}`);
  check('ABC otomatik fiyat (cost 18K × Toptan 1.10)', 19800, Number(lineAutoPrice));
  await fillLineField(page, 'quantity', 2);
  const salesRes = await tryPost(page, /\/v2\/documents\/sales-invoice(\/|$)/);
  record('Satış faturası geçti', salesRes.ok, salesRes.ok ? '' : salesRes.error);

  // ─── 5: TAHSİLAT — ABC → Ana Kasa TRY ──────────────────────────────
  header('5 — Tahsilat: ABC → Ana Kasa TRY, 2 × 19.800 = 39.600 TRY');
  await page.goto(`${BASE_URL}/${LOCALE}/v2/documents/payment-received/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(STEP);
  await pickComboboxByName(page, 'customer', 'ABC Ticaret');
  await pickComboboxByName(page, 'cashRegister', 'Ana Kasa TRY');
  await page.selectOption('select[name=currency]', 'TRY').catch(() => {});
  await page.fill('input[name=fxRate]', '1').catch(() => {});
  await page.fill('input[name=amount]', '39600');
  const paymentRes = await tryPost(page, /\/v2\/documents\/payment-received(\/|$)/);
  record('Tahsilat geçti', paymentRes.ok, paymentRes.ok ? '' : paymentRes.error);

  // ─── 6: Doğrulama — kasa bakiyesi & AR ─────────────────────────────
  header('6 — Doğrulama');
  const kasa = await db.catalog_treasury_cash_register.findFirst({
    where: { tenantId: TENANT_ID, name: 'Ana Kasa TRY' },
  });
  const opening = Number(kasa?.openingBalance ?? 0);
  const rows = await db.movement_treasury_cash_funds.findMany({
    where: {
      tenantId: TENANT_ID,
      cashRegister: kasa.id,
      active: true,
      currencyOriginal: kasa.currency,
    },
    select: { kind: true, amountOriginal: true },
  });
  let kasaBal = opening;
  for (const r of rows) {
    const a = Number(r.amountOriginal ?? 0);
    kasaBal += r.kind === 'income' ? a : -a;
  }
  check('Ana Kasa TRY bakiye (opening 25K + tahsilat 39.6K = 64.6K)', 64600, kasaBal);

  const arRows = await db.movement_sales_accounts_receivable.findMany({
    where: { tenantId: TENANT_ID, customer: abc.id, active: true, currencyOriginal: 'TRY' },
    select: { kind: true, amountOriginal: true },
  });
  let arNet = 0;
  for (const r of arRows) {
    const a = Number(r.amountOriginal ?? 0);
    arNet += r.kind === 'income' ? a : -a;
  }
  check('ABC AR TRY net (0 = tahsil edildi)', 0, arNet);

  // ─── 7: Register turu (görsel) ──────────────────────────────────────
  header('7 — Register turu (görsel)');
  for (const url of [
    '/v2/registers/accounts_receivable',
    '/v2/registers/cash_funds',
    '/v2/registers/stock-balance',
    '/v2/dashboard',
  ]) {
    line(`   · Ziyaret: ${url}`);
    await page.goto(`${BASE_URL}/${LOCALE}${url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(STEP * 2);
  }

  // ─── 8: Yeni raporlar turu (Cari Kartı, Ürün Kartı, Stok Değerleme) ─
  header('8 — Yeni raporlar (Cari Kartı · Ürün Kartı · Stok Değerleme)');
  const reportTour = [
    { url: '/v2/reports', label: "Rapor hub'ı (yeni kartlar listede)" },
    { url: '/v2/reports/counterparty-card', label: 'Cari Kartı — Müşteriler (default chip)' },
    {
      url: '/v2/reports/counterparty-card?chip=suppliers',
      label: 'Cari Kartı — Tedarikçiler chip',
    },
    { url: '/v2/reports/product-card', label: 'Ürün Kartı — dönem hareket özeti' },
    {
      url: '/v2/reports/inventory-valuation',
      label: 'Stok Değerleme — depo × ürün × adet × maliyet',
    },
  ];
  for (const r of reportTour) {
    line(`   · ${r.label}`);
    await page.goto(`${BASE_URL}/${LOCALE}${r.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(STEP * 3);
    const totalsCell = await page
      .locator('table tfoot, tr.totals, [data-totals]')
      .first()
      .textContent()
      .catch(() => null);
    if (totalsCell) line(`     ↳ totals: ${totalsCell.trim().slice(0, 140)}`);
  }
  record('Yeni raporlar — 5 sayfa görsel turu tamamlandı', true, '');

  header('Walkthrough bitti — tarayıcı 25 saniye açık kalacak (incele).');
  await page.waitForTimeout(HEADED ? 25000 : 500);
  await browser.close();

  // Summary
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  header('Özet');
  line(`   Toplam ${results.length}  ·  ${pass} ✅  ·  ${fail} ❌`);
  for (const r of results) {
    line(`   ${r.ok ? '✅' : '❌'} ${r.name}${r.info ? `  (${r.info})` : ''}`);
  }
  await db.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
