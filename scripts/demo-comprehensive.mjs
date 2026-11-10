#!/usr/bin/env node
/**
 * Comprehensive multi-currency demo
 * ─────────────────────────────────────────────────────────────────────────
 * Tek script:
 *   0. DB temizle + dev-bypass seed + FX rates set (Prisma direkt)
 *   1. Tarayıcı aç — Currency picker'da KGS ekle
 *   2. Kasalar oluştur (TRY, USD, RUB)
 *   3. 2 müşteri (ABC TRY, Pacific Trade USD)
 *   4. Alış (XYZ'den RUB) → stok + AP doğrula
 *   5. Tedarikçiye ödeme (Kasa RUB → XYZ)
 *   6. Satış-1 (ABC TRY)
 *   7. Tahsilat-1 (Ana Kasa)
 *   8. Satış-2 (Pacific USD, kur=32)
 *   9. Tahsilat-2 (Kasa USD, kur=33 — KUR FARKI test)
 *  10. Stok transfer (Ana → Şube)
 *  11. Final özet
 */

import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const TENANT_ID = '00000000-0000-0000-0000-000000d3b001';
const USER_ID = '00000000-0000-0000-0000-000000d3b002';
const BASE_URL = 'http://localhost:3100';

// Slow enough to follow with the eye but not glacial. User asked "biraz yavaş".
const SLOW_MO = 700;
const STEP_PAUSE = 2200;

const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

// ─── PASS/FAIL collector ─────────────────────────────────────────────────
const results = [];
function log(msg) {
  console.log(`\n━━━━━━━━━━ ${msg} ━━━━━━━━━━`);
}
function info(msg) {
  console.log(`   · ${msg}`);
}
function check(name, expected, actual, tol = 0.01) {
  const isNum = typeof expected === 'number';
  const ok = isNum
    ? Math.abs(Number(actual) - expected) < tol
    : JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, ok, expected, actual });
  console.log(`   ${ok ? '✅' : '❌'} ${name}  exp=${expected}  act=${actual}`);
  return ok;
}

// ─── PHASE 0: DB cleanup + seed + FX rates ───────────────────────────────
async function cleanupDB() {
  log('Phase 0.A — DB temizleme');
  const rows = await db.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public'
         AND (table_name LIKE 'catalog_%'
              OR table_name LIKE 'document_%'
              OR table_name LIKE 'movement_%'
              OR table_name IN ('audit_log','document_sequence','fx_rate'))`,
  );
  const list = rows.map((r) => `"${r.table_name}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
  info(`${rows.length} tablo TRUNCATE edildi`);
}

async function seedDevBypass() {
  log('Phase 0.B — Dev-bypass tenant + role + membership seed');
  await db.tenant.upsert({
    where: { id: TENANT_ID },
    create: {
      id: TENANT_ID,
      clerkOrgId: 'org_dev_bypass',
      name: 'Dev Bypass',
      slug: 'dev-bypass',
      currency: 'TRY',
      plan: 'enterprise',
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    update: { currency: 'TRY' },
  });
  await db.user.upsert({
    where: { id: USER_ID },
    create: {
      id: USER_ID,
      clerkId: 'user_dev_bypass',
      email: 'dev-bypass@localhost',
      firstName: 'Dev',
      lastName: 'Bypass',
    },
    update: {},
  });
  const owner = await db.role.upsert({
    where: { tenantId_name: { tenantId: TENANT_ID, name: 'owner' } },
    create: {
      tenantId: TENANT_ID,
      name: 'owner',
      description: 'Owner',
      isSystem: true,
      permissions: ['*'],
    },
    update: {},
  });
  await db.membership.upsert({
    where: { tenantId_userId: { tenantId: TENANT_ID, userId: USER_ID } },
    create: {
      tenantId: TENANT_ID,
      userId: USER_ID,
      roles: { connect: { id: owner.id } },
    },
    update: { roles: { set: [{ id: owner.id }] } },
  });
  info('Tenant + user + owner role + membership hazır (base=TRY)');
}

async function setFxRates() {
  log('Phase 0.C — FX rates (TRY base)');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // base=foreign, quote=TRY, rate = 1 foreign = N TRY
  const rates = [
    { base: 'USD', rate: 32 },
    { base: 'EUR', rate: 35 },
    { base: 'RUB', rate: 0.4 },
    { base: 'KGS', rate: 0.37 },
  ];
  for (const r of rates) {
    await db.fxRate.upsert({
      where: {
        tenantId_base_quote_date: {
          tenantId: TENANT_ID,
          base: r.base,
          quote: 'TRY',
          date: today,
        },
      },
      create: {
        tenantId: TENANT_ID,
        base: r.base,
        quote: 'TRY',
        date: today,
        rate: r.rate,
        source: 'MANUAL',
      },
      update: { rate: r.rate, source: 'MANUAL' },
    });
    info(`1 ${r.base} = ${r.rate} TRY`);
  }
  // Today's rates set. We'll add a "tomorrow" USD rate later to test FX P&L.
}

// ─── PHASE 1: Browser tour ───────────────────────────────────────────────
async function pickComboboxByName(page, name, optionText) {
  const root = page.locator(`div.combobox:has(input[name="${name}"])`).first();
  await root.locator('button.combobox-trigger').click();
  await page.waitForTimeout(900);
  await page.locator('.combobox-popover .combobox-option', { hasText: optionText }).first().click();
  await page.waitForTimeout(900);
}

async function pickLineProduct(page, productText, rowIdx = 0) {
  const row = page.locator('table.v2-doc-lines tbody tr').nth(rowIdx);
  await row.locator('button.combobox-trigger').first().click();
  await page.waitForTimeout(900);
  await page
    .locator('.combobox-popover .combobox-option', { hasText: productText })
    .first()
    .click();
  await page.waitForTimeout(900);
}

async function fillLineField(page, suffix, value, rowIdx = 0) {
  const input = page
    .locator('table.v2-doc-lines tbody tr')
    .nth(rowIdx)
    .locator(`input[name$=".${suffix}"]`)
    .first();
  await input.fill(String(value));
  await input.press('Tab');
  await page.waitForTimeout(700);
}

async function postDocument(page, redirectRe) {
  const before = page.url();
  await page.getByRole('button', { name: /^Kaydet ve Posta Et$/ }).click();
  // Wait for the URL to actually change (away from /new). The redirect-on-success
  // path leaves /new for the list or detail page; a posting error keeps us on /new
  // and surfaces a form-error toast/banner instead.
  try {
    await page.waitForURL((u) => u.toString() !== before && redirectRe.test(u.toString()), {
      timeout: 12000,
    });
  } catch {
    // Capture surfaced error
    const err = await page
      .locator('.form-error, .field-error')
      .first()
      .textContent()
      .catch(() => null);
    console.log(`   ⚠ POST hatası — URL hâlâ: ${page.url()}${err ? ' · err=' + err.trim() : ''}`);
  }
  await page.waitForTimeout(STEP_PAUSE);
}

async function browserTour() {
  log('Phase 1 — Tarayıcı açılıyor (Chromium görünür, slowMo=' + SLOW_MO + 'ms)');
  const browser = await chromium.launch({ headless: false, slowMo: SLOW_MO });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ─── 1.1: Currency catalog ─────────────────────────────────────────
  log('1.1 — Currency catalog: 5 currency aktifleştir');
  info('Dashboard → Kataloglar → Para birimleri → Para birimi ekle');
  await page.goto(`${BASE_URL}/tr/v2/catalogs/currency`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(STEP_PAUSE);
  await page.getByRole('link', { name: 'Para birimi ekle' }).first().click();
  await page.waitForURL(/\/v2\/catalogs\/currency\/new$/);
  await page.waitForTimeout(1500);
  info('TRY, USD, EUR, RUB, KGS işaretleyip ekliyoruz');
  for (const code of ['TRY', 'USD', 'EUR', 'RUB', 'KGS']) {
    await page.click(`label[for=pick-${code}]`);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(STEP_PAUSE);
  await page.getByRole('button', { name: /^Ekle/ }).click();
  await page.waitForURL(/\/v2\/catalogs\/currency$/);
  await page.waitForTimeout(STEP_PAUSE);

  // Verify in DB
  const ccyCount = await db.catalog_platform_currency.count({
    where: { tenantId: TENANT_ID, deletedAt: null, enabled: true },
  });
  check('Aktif currency sayısı', 5, ccyCount);

  // ─── 1.2: Cash registers ────────────────────────────────────────────
  log('1.2 — 3 kasa oluştur (her currency için ayrı kasa)');
  const kasalar = [
    { name: 'Ana Kasa TRY', currency: 'TRY', opening: 25000 }, // 25K TRY açılış
    { name: 'Kasa USD', currency: 'USD', opening: 500 }, // 500 USD açılış
    { name: 'Kasa RUB', currency: 'RUB', opening: 1000000 }, // 1M RUB başlangıç
  ];
  for (const k of kasalar) {
    info(`${k.name}  (currency=${k.currency}, açılış=${k.opening})`);
    await page.goto(`${BASE_URL}/tr/v2/catalogs/cash-registers/new`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1500);
    await page.fill('input[name=name]', k.name);
    await page.waitForTimeout(500);
    await page.selectOption('select[name=currency]', k.currency);
    await page.waitForTimeout(500);
    await page.fill('input[name=openingBalance]', String(k.opening));
    await page.waitForTimeout(STEP_PAUSE);
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/v2\/catalogs\/cash-registers$/, { timeout: 10000 });
    await page.waitForTimeout(1500);
  }
  const kasaCount = await db.catalog_treasury_cash_register.count({
    where: { tenantId: TENANT_ID, deletedAt: null },
  });
  check('Kasa sayısı', 3, kasaCount);

  // ─── 1.3: Depolar (2 adet) ──────────────────────────────────────────
  log('1.3 — 2 depo oluştur (Ana Depo, Şube Depo)');
  for (const d of [
    { name: 'Ana Depo', address: 'Istanbul' },
    { name: 'Şube Depo', address: 'Ankara' },
  ]) {
    info(`${d.name} (${d.address})`);
    await page.goto(`${BASE_URL}/tr/v2/catalogs/warehouses/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.fill('input[name=name]', d.name);
    await page.fill('textarea[name=address]', d.address);
    await page.waitForTimeout(STEP_PAUSE);
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/v2\/catalogs\/warehouses$/, { timeout: 10000 });
    await page.waitForTimeout(1500);
  }
  check(
    'Depo sayısı',
    2,
    await db.catalog_inventory_warehouse.count({
      where: { tenantId: TENANT_ID, deletedAt: null },
    }),
  );

  // ─── 1.4: Ürün ──────────────────────────────────────────────────────
  log('1.4 — Ürün ekle: Laptop X1');
  info('listPrice: 60.000 (referans için — fatura kesince manuel girilebilir)');
  await page.goto(`${BASE_URL}/tr/v2/catalogs/products/new`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.fill('input[name=name]', 'Laptop X1');
  await page.fill('input[name=unit]', 'adet');
  await page.fill('input[name=listPrice]', '60000');
  await page.waitForTimeout(STEP_PAUSE);
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await page.waitForURL(/\/v2\/catalogs\/products$/, { timeout: 10000 });
  await page.waitForTimeout(1500);

  // ─── 1.5: Müşteriler ────────────────────────────────────────────────
  log('1.5 — 2 müşteri (ABC TRY, Pacific Trade USD)');
  for (const c of [
    { name: 'ABC Ticaret A.Ş.', phone: '+90 212 555 0001' },
    { name: 'Pacific Trade LLC', phone: '+1 415 555 0002' },
  ]) {
    info(`${c.name}`);
    await page.goto(`${BASE_URL}/tr/v2/catalogs/partners/customers/new`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1500);
    await page.fill('input[name=name]', c.name);
    await page.fill('input[name=phone]', c.phone);
    await page.waitForTimeout(STEP_PAUSE);
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/v2\/catalogs\/partners\/customers/, { timeout: 10000 });
    await page.waitForTimeout(1500);
  }

  // ─── 1.6: Tedarikçi ─────────────────────────────────────────────────
  log('1.6 — 1 tedarikçi: XYZ Tedarik (Rusya, RUB ile çalışacağız)');
  await page.goto(`${BASE_URL}/tr/v2/catalogs/partners/suppliers/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(1500);
  await page.fill('input[name=name]', 'XYZ Tedarik Ltd. (Rusya)');
  await page.fill('input[name=phone]', '+7 495 000 0003');
  await page.waitForTimeout(STEP_PAUSE);
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await page.waitForURL(/\/v2\/catalogs\/partners\/suppliers/, { timeout: 10000 });
  await page.waitForTimeout(STEP_PAUSE);

  // ─── 2.1: ALIŞ — XYZ'den RUB ile 10 laptop ──────────────────────────
  log('2.1 — ALIŞ FATURASI: XYZ Tedarik, 10× Laptop @ 50.000 RUB');
  info('Document currency = RUB, kur = 0.40 (1 RUB = 0.40 TRY)');
  await page.goto(`${BASE_URL}/tr/v2/purchases/purchase-invoice/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(STEP_PAUSE);
  await pickComboboxByName(page, 'supplier', 'XYZ Tedarik');
  await pickComboboxByName(page, 'warehouse', 'Ana Depo');
  await page.selectOption('select[name=currency]', 'RUB');
  await page.waitForTimeout(700);
  await page.fill('input[name=fxRate]', '0.40');
  await page.waitForTimeout(700);
  await pickLineProduct(page, 'Laptop X1', 0);
  await fillLineField(page, 'quantity', 10, 0);
  await fillLineField(page, 'price', 50000, 0);
  await page.waitForTimeout(STEP_PAUSE);
  await postDocument(page, /\/v2\/purchases\/purchase-invoice(\/|$)/);

  log('2.1 doğrulama — stok + AP');
  await page.waitForTimeout(1000);
  const stockAna = await stockBalance('Ana Depo', 'Laptop X1');
  check('Ana Depo / Laptop X1 stok', 10, stockAna);
  const apRub = await apForSupplier('XYZ Tedarik', 'RUB');
  check('AP[XYZ, RUB] orijinal', 500000, apRub.original);
  check('AP[XYZ, RUB] base TRY (= 500.000 × 0.40)', 200000, apRub.base);

  // ─── 2.2: ÖDEME — Kasa RUB → XYZ ────────────────────────────────────
  log('2.2 — TEDARİKÇİYE ÖDEME: Kasa RUB → XYZ, 500.000 RUB');
  await page.goto(`${BASE_URL}/tr/v2/purchases/payment-sent/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(STEP_PAUSE);
  await pickComboboxByName(page, 'supplier', 'XYZ Tedarik');
  await pickComboboxByName(page, 'cashRegister', 'Kasa RUB');
  await page.selectOption('select[name=currency]', 'RUB');
  await page.waitForTimeout(700);
  await page.fill('input[name=fxRate]', '0.40');
  await page.waitForTimeout(700);
  await page.fill('input[name=amount]', '500000');
  await page.waitForTimeout(STEP_PAUSE);
  await postDocument(page, /\/v2\/purchases\/payment-sent(\/|$)/);

  log('2.2 doğrulama — AP[XYZ, RUB] = 0, Kasa RUB = 500.000 (1M − 500K)');
  await page.waitForTimeout(1000);
  const apRubAfter = await apForSupplier('XYZ Tedarik', 'RUB');
  check('AP[XYZ, RUB] kalan', 0, apRubAfter.original);
  const kasaRub = await cashBalance('Kasa RUB');
  check('Kasa RUB bakiye', 500000, kasaRub);

  // ─── 3.1: SATIŞ-1 — ABC'ye TRY (3 × 60.000) ─────────────────────────
  log('3.1 — SATIŞ-1: ABC Ticaret, 3× Laptop @ 60.000 TRY');
  info('Document currency = TRY, kur = 1 (base = TRY)');
  await page.goto(`${BASE_URL}/tr/v2/documents/sales-invoice/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(STEP_PAUSE);
  await pickComboboxByName(page, 'customer', 'ABC Ticaret');
  await pickComboboxByName(page, 'warehouse', 'Ana Depo');
  await page.selectOption('select[name=currency]', 'TRY');
  await page.waitForTimeout(700);
  await page.fill('input[name=fxRate]', '1');
  await page.waitForTimeout(700);
  await pickLineProduct(page, 'Laptop X1', 0);
  await fillLineField(page, 'quantity', 3, 0);
  await fillLineField(page, 'price', 60000, 0);
  await page.waitForTimeout(STEP_PAUSE);
  await postDocument(page, /\/v2\/documents\/sales-invoice(\/|$)/);

  log('3.1 doğrulama — stok 10→7, AR[ABC, TRY] = 180.000');
  await page.waitForTimeout(1000);
  check('Ana Depo stok kalan', 7, await stockBalance('Ana Depo', 'Laptop X1'));
  const arAbc = await arForCustomer('ABC Ticaret', 'TRY');
  check('AR[ABC, TRY] orijinal', 180000, arAbc.original);
  check('AR[ABC, TRY] base', 180000, arAbc.base);

  // ─── 3.2: TAHSİLAT-1 — Ana Kasa TRY ─────────────────────────────────
  log('3.2 — TAHSİLAT-1: ABC → Ana Kasa TRY, 180.000 TRY');
  await page.goto(`${BASE_URL}/tr/v2/documents/payment-received/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(STEP_PAUSE);
  await pickComboboxByName(page, 'customer', 'ABC Ticaret');
  await pickComboboxByName(page, 'cashRegister', 'Ana Kasa TRY');
  await page.selectOption('select[name=currency]', 'TRY');
  await page.waitForTimeout(700);
  await page.fill('input[name=fxRate]', '1');
  await page.waitForTimeout(700);
  await page.fill('input[name=amount]', '180000');
  await page.waitForTimeout(STEP_PAUSE);
  await postDocument(page, /\/v2\/documents\/payment-received(\/|$)/);

  log('3.2 doğrulama — AR[ABC] = 0, Ana Kasa TRY = 180.000');
  await page.waitForTimeout(1000);
  check('AR[ABC, TRY] kalan', 0, (await arForCustomer('ABC Ticaret', 'TRY')).original);
  // Ana Kasa TRY = 25K opening + 180K tahsilat = 205K
  check('Ana Kasa TRY bakiye', 205000, await cashBalance('Ana Kasa TRY'));

  // ─── 4.1: SATIŞ-2 — Pacific'e USD (2 × 1.900) — kur=32 ──────────────
  log('4.1 — SATIŞ-2: Pacific Trade, 2× Laptop @ 1.900 USD (kur=32)');
  await page.goto(`${BASE_URL}/tr/v2/documents/sales-invoice/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(STEP_PAUSE);
  await pickComboboxByName(page, 'customer', 'Pacific Trade');
  await pickComboboxByName(page, 'warehouse', 'Ana Depo');
  await page.selectOption('select[name=currency]', 'USD');
  await page.waitForTimeout(700);
  await page.fill('input[name=fxRate]', '32');
  await page.waitForTimeout(700);
  await pickLineProduct(page, 'Laptop X1', 0);
  await fillLineField(page, 'quantity', 2, 0);
  await fillLineField(page, 'price', 1900, 0);
  await page.waitForTimeout(STEP_PAUSE);
  await postDocument(page, /\/v2\/documents\/sales-invoice(\/|$)/);

  log('4.1 doğrulama — stok 7→5, AR[Pacific, USD] = 3.800 / 121.600 TRY');
  await page.waitForTimeout(1000);
  check('Ana Depo stok kalan', 5, await stockBalance('Ana Depo', 'Laptop X1'));
  const arPac = await arForCustomer('Pacific Trade', 'USD');
  check('AR[Pacific, USD] orijinal', 3800, arPac.original);
  check('AR[Pacific, USD] base TRY (3800×32)', 121600, arPac.base);

  // ─── 4.2: TAHSİLAT-2 — kur farkı testi (kur=33) ─────────────────────
  log('4.2 — TAHSİLAT-2: Pacific → Kasa USD, 3.800 USD, kur=33 (KUR DEĞİŞTİ)');
  info('Fatura kuru 32 → ödeme kuru 33 → FX P&L = (33-32) × 3800 = +3.800 TRY KÂR');
  await page.goto(`${BASE_URL}/tr/v2/documents/payment-received/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(STEP_PAUSE);
  await pickComboboxByName(page, 'customer', 'Pacific Trade');
  await pickComboboxByName(page, 'cashRegister', 'Kasa USD');
  await page.selectOption('select[name=currency]', 'USD');
  await page.waitForTimeout(700);
  await page.fill('input[name=fxRate]', '33');
  await page.waitForTimeout(700);
  await page.fill('input[name=amount]', '3800');
  await page.waitForTimeout(STEP_PAUSE);
  await postDocument(page, /\/v2\/documents\/payment-received(\/|$)/);

  log('4.2 doğrulama — AR Pacific = 0, Kasa USD = 3.800, fx_pl = +3.800 TRY');
  await page.waitForTimeout(1000);
  check('AR[Pacific, USD] kalan', 0, (await arForCustomer('Pacific Trade', 'USD')).original);
  // Kasa USD = 500 opening + 3800 tahsilat = 4300
  check('Kasa USD bakiye', 4300, await cashBalance('Kasa USD'));
  const fxPl = await fxPlTotal();
  check('FX P&L toplam (TRY)', 3800, fxPl);

  // ─── 5: STOK TRANSFER ──────────────────────────────────────────────
  log('5 — STOK TRANSFER: Ana Depo → Şube Depo, 2× Laptop X1');
  await page.goto(`${BASE_URL}/tr/v2/documents/stock-transfer/new`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(STEP_PAUSE);
  // stock-transfer header fields: sourceWarehouse + destinationWarehouse
  await pickComboboxByName(page, 'sourceWarehouse', 'Ana Depo');
  await pickComboboxByName(page, 'destinationWarehouse', 'Şube Depo');
  await page.waitForTimeout(700);
  await pickLineProduct(page, 'Laptop X1', 0);
  await fillLineField(page, 'quantity', 2, 0);
  await page.waitForTimeout(STEP_PAUSE);
  await postDocument(page, /\/v2\/documents\/stock-transfer(\/|$)/);

  log('5 doğrulama — Ana 5→3, Şube 0→2');
  await page.waitForTimeout(1000);
  check('Ana Depo stok', 3, await stockBalance('Ana Depo', 'Laptop X1'));
  check('Şube Depo stok', 2, await stockBalance('Şube Depo', 'Laptop X1'));

  // ─── 6: REGISTER TURU ──────────────────────────────────────────────
  log('6 — Register turu (görsel olarak gez)');
  for (const route of [
    '/v2/registers/accounts_receivable',
    '/v2/registers/accounts_payable',
    '/v2/registers/stock-balance',
    '/v2/registers/sales',
    '/v2/dashboard',
  ]) {
    info(`Ziyaret: ${route}`);
    await page.goto(`${BASE_URL}/tr${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(STEP_PAUSE);
  }

  log('Demo bitti — tarayıcı 60 saniye açık kalacak (incele).');
  await page.waitForTimeout(60000);
  await browser.close();
}

// ─── DB query helpers ────────────────────────────────────────────────────
async function stockBalance(warehouseName, productName) {
  const wh = await db.catalog_inventory_warehouse.findFirst({
    where: { tenantId: TENANT_ID, name: warehouseName },
  });
  const pr = await db.catalog_inventory_product.findFirst({
    where: { tenantId: TENANT_ID, name: productName },
  });
  if (!wh || !pr) return null;
  const movements = await db.movement_inventory_stock_balance.findMany({
    where: { tenantId: TENANT_ID, warehouse: wh.id, product: pr.id, active: true },
    select: { kind: true, quantity: true },
  });
  let net = 0;
  for (const m of movements) {
    const q = Number(m.quantity);
    net += m.kind === 'income' ? q : -q;
  }
  return net;
}

async function arForCustomer(customerName, currency) {
  const cu = await db.catalog_sales_customer.findFirst({
    where: { tenantId: TENANT_ID, name: { contains: customerName } },
  });
  if (!cu) return { original: 0, base: 0 };
  const rows = await db.movement_sales_accounts_receivable.findMany({
    where: { tenantId: TENANT_ID, customer: cu.id, active: true },
    select: { kind: true, amount: true, amountOriginal: true, currencyOriginal: true },
  });
  let original = 0;
  let base = 0;
  for (const r of rows) {
    if (r.currencyOriginal !== currency && r.currencyOriginal != null) continue;
    const orig = Number(r.amountOriginal ?? r.amount);
    const b = Number(r.amount);
    const sign = r.kind === 'income' ? 1 : -1;
    original += sign * orig;
    base += sign * b;
  }
  return { original, base };
}

async function apForSupplier(supplierName, currency) {
  const su = await db.catalog_purchases_supplier.findFirst({
    where: { tenantId: TENANT_ID, name: { contains: supplierName } },
  });
  if (!su) return { original: 0, base: 0 };
  const rows = await db.movement_purchases_accounts_payable.findMany({
    where: { tenantId: TENANT_ID, supplier: su.id, active: true },
    select: { kind: true, amount: true, amountOriginal: true, currencyOriginal: true },
  });
  let original = 0;
  let base = 0;
  for (const r of rows) {
    if (r.currencyOriginal !== currency && r.currencyOriginal != null) continue;
    const orig = Number(r.amountOriginal ?? r.amount);
    const b = Number(r.amount);
    const sign = r.kind === 'income' ? 1 : -1;
    original += sign * orig;
    base += sign * b;
  }
  return { original, base };
}

async function cashBalance(kasaName) {
  const kasa = await db.catalog_treasury_cash_register.findFirst({
    where: { tenantId: TENANT_ID, name: kasaName },
  });
  if (!kasa) return 0;
  const opening = Number(kasa.openingBalance ?? 0);
  // 1C-canonical: kasa balance is reported in the kasa's own currency.
  const rows = await db.movement_treasury_cash_funds.findMany({
    where: {
      tenantId: TENANT_ID,
      cashRegister: kasa.id,
      active: true,
      currencyOriginal: kasa.currency,
    },
    select: { kind: true, amountOriginal: true },
  });
  let net = opening;
  for (const r of rows) {
    const a = Number(r.amountOriginal ?? 0);
    net += r.kind === 'income' ? a : -a;
  }
  return net;
}

async function fxPlTotal() {
  const rows = await db.movement_treasury_fx_pl.findMany({
    where: { tenantId: TENANT_ID, active: true },
    select: { kind: true, amount: true },
  });
  let net = 0;
  for (const r of rows) {
    const a = Number(r.amount);
    // fx_pl uses gain/loss kinds (income/expense semantics)
    net += r.kind === 'gain' || r.kind === 'income' ? a : -a;
  }
  return net;
}

// ─── MAIN ────────────────────────────────────────────────────────────────
async function main() {
  await cleanupDB();
  await seedDevBypass();
  await setFxRates();

  // Trigger dev-bypass to upsert seedSystemRoles + membership (force full role set)
  await fetch(`${BASE_URL}/tr/v2/dashboard`).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  await browserTour();

  // Final summary
  log('FINAL ÖZET');
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n   Toplam ${results.length}  ·  ${pass} ✅  ·  ${fail} ❌\n`);
  for (const r of results) {
    console.log(`   ${r.ok ? '✅' : '❌'} ${r.name}  (exp=${r.expected} act=${r.actual})`);
  }
  console.log('');

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error('DEMO HATA:', e);
  await db.$disconnect();
  process.exit(1);
});
