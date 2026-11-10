#!/usr/bin/env node
/**
 * Pass 1: HTTP smoke test
 * Every catalog / document / register / admin / super-admin / report route
 * returns 200 AND contains the expected primary form/topbar element.
 * No DB writes — pure route render check.
 */
import { chromium } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const BASE = 'http://localhost:3100';
const LOCALE = 'tr';

// Routes to smoke. Marked as: route, expected substring on success.
const ROUTES = [
  // Top-level
  { url: '/v2/dashboard', expect: 'Dashboard' },
  { url: '/v2/registers', expect: 'Kayıtlar' },
  // Catalogs — list pages
  { url: '/v2/catalogs/products', expect: 'Ürün' },
  { url: '/v2/catalogs/partners', expect: 'Cari' },
  { url: '/v2/catalogs/partners/customers', expect: 'Müşteri' },
  { url: '/v2/catalogs/partners/suppliers', expect: 'Tedarikçi' },
  { url: '/v2/catalogs/price-types', expect: 'Fiyat' },
  { url: '/v2/catalogs/cash-registers', expect: 'Kasa' },
  { url: '/v2/catalogs/warehouses', expect: 'Depo' },
  { url: '/v2/catalogs/fixed-assets', expect: 'Sabit' },
  // Catalogs — new pages
  { url: '/v2/catalogs/products/new', expect: 'Kaydet' },
  { url: '/v2/catalogs/partners/customers/new', expect: 'Kaydet' },
  { url: '/v2/catalogs/partners/suppliers/new', expect: 'Kaydet' },
  { url: '/v2/catalogs/price-types/new', expect: 'Kaydet' },
  { url: '/v2/catalogs/currency/new', expect: 'Ekle' },
  { url: '/v2/catalogs/cash-registers/new', expect: 'Kaydet' },
  { url: '/v2/catalogs/warehouses/new', expect: 'Kaydet' },
  // Active documents — list pages
  { url: '/v2/documents/sales-invoice', expect: 'Satış' },
  { url: '/v2/documents/payment-received', expect: 'Tahsil' },
  { url: '/v2/documents/bank-receipt', expect: 'Banka' },
  { url: '/v2/documents/return-invoice', expect: 'İade' },
  { url: '/v2/documents/refund-payment', expect: 'iade' },
  { url: '/v2/purchases/purchase-invoice', expect: 'Alış' },
  { url: '/v2/purchases/payment-sent', expect: 'Ödeme' },
  { url: '/v2/documents/bank-payment', expect: 'Banka' },
  { url: '/v2/purchases/return-purchase', expect: 'İade' },
  { url: '/v2/documents/refund-received', expect: 'iade' },
  { url: '/v2/documents/inventory-count', expect: 'Inventory' },
  { url: '/v2/documents/stock-adjustment', expect: 'Adjustment' },
  { url: '/v2/documents/stock-transfer', expect: 'Transfer' },
  { url: '/v2/documents/price-setting', expect: 'Price' },
  { url: '/v2/documents/cash-transfer', expect: 'transfer' },
  { url: '/v2/documents/bank-deposit', expect: 'Bank' },
  { url: '/v2/documents/bank-withdrawal', expect: 'Bank' },
  { url: '/v2/documents', expect: 'Documents' },
  // Active documents — new pages
  { url: '/v2/documents/sales-invoice/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/payment-received/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/bank-receipt/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/return-invoice/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/refund-payment/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/purchases/purchase-invoice/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/purchases/payment-sent/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/bank-payment/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/purchases/return-purchase/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/refund-received/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/inventory-count/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/stock-adjustment/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/stock-transfer/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/price-setting/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/cash-transfer/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/bank-deposit/new', expect: 'Kaydet ve Posta' },
  { url: '/v2/documents/bank-withdrawal/new', expect: 'Kaydet ve Posta' },
  // Registers
  { url: '/v2/registers/accounts_receivable', expect: 'Alacak' },
  { url: '/v2/registers/accounts_payable', expect: 'Borç' },
  { url: '/v2/registers/sales', expect: 'Satış' },
  { url: '/v2/registers/stock-balance', expect: 'Stok' },
  { url: '/v2/registers/cash_funds', expect: 'Kasa' },
  { url: '/v2/registers/product-prices', expect: 'Fiyat' },
  // Admin
  { url: '/v2/admin/members', expect: 'Üyeler' },
  { url: '/v2/admin/roles', expect: 'Roller' },
  { url: '/v2/admin/audit', expect: 'Denetim' },
  { url: '/v2/admin/fx-rates', expect: 'Döviz' },
  { url: '/v2/admin/period-close', expect: 'kapanış' },
  { url: '/v2/admin/period-close/fx', expect: 'Kur' },
  { url: '/v2/admin/branding', expect: 'Marka' },
  { url: '/v2/admin/danger', expect: 'Tehlikeli' },
  { url: '/v2/admin/import', expect: 'İçe aktar' },
  { url: '/v2/admin/currencies', expect: 'Para' },
  { url: '/v2/admin/mobile-features', expect: 'Mobil' },
  { url: '/v2/admin/platform-toggles', expect: 'toggle' },
  { url: '/v2/admin/security', expect: 'Güvenlik' },
  { url: '/v2/admin/tax', expect: 'Vergi' },
  // Reports
  { url: '/v2/reports/gross-profit', expect: 'Brüt' },
  { url: '/v2/reports/turnover', expect: 'Ciro' },
  { url: '/v2/reports/counterparty-card', expect: 'Cari' },
  { url: '/v2/reports/product-card', expect: 'Ürün' },
  { url: '/v2/reports/inventory-valuation', expect: 'Stok' },
  // Settings
  { url: '/v2/settings', expect: 'Ayarlar' },
  { url: '/v2/settings/billing', expect: 'Fatura' },
  // Onboarding
  { url: '/v2/onboarding/welcome', expect: 'Welcome' },
  { url: '/v2/onboarding/workspace', expect: 'Çalışma alan' },
  { url: '/v2/onboarding/currency', expect: 'Para birim' },
  { url: '/v2/onboarding/demo', expect: 'Demo' },
  { url: '/v2/onboarding/tour', expect: 'Tour' },
  { url: '/v2/onboarding/done', expect: 'done' },
];

const results = [];

async function smoke(page, route) {
  const url = `${BASE}/${LOCALE}${route.url}`;
  const start = Date.now();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = resp?.status() ?? 0;
    if (status !== 200) {
      results.push({ url: route.url, ok: false, status, reason: `HTTP ${status}` });
      return;
    }
    const html = await page.content();
    // Detect Next.js dev error overlay / "not found" surrogate
    if (html.includes('__next_error__') || html.includes('Application error')) {
      results.push({ url: route.url, ok: false, status, reason: 'Next error overlay' });
      return;
    }
    if (route.expect && !html.toLowerCase().includes(route.expect.toLowerCase())) {
      results.push({
        url: route.url,
        ok: false,
        status,
        reason: `missing expected text "${route.expect}"`,
      });
      return;
    }
    const ms = Date.now() - start;
    results.push({ url: route.url, ok: true, status, ms });
  } catch (e) {
    results.push({
      url: route.url,
      ok: false,
      status: 0,
      reason: e.message?.slice(0, 80) ?? 'err',
    });
  }
}

async function main() {
  console.log(`Pass 1 (smoke) — ${ROUTES.length} route\n`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Warm up dev-bypass before measuring
  await page.goto(`${BASE}/${LOCALE}/v2/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  for (const r of ROUTES) {
    await smoke(page, r);
    const last = results[results.length - 1];
    const icon = last.ok ? '✅' : '❌';
    const tail = last.ok ? `${last.ms}ms` : last.reason;
    console.log(`  ${icon} ${r.url}  · ${tail}`);
  }
  await browser.close();

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n${pass} ✅  ·  ${fail} ❌  ·  toplam ${results.length}`);

  if (fail > 0) {
    console.log('\nFAILED routes:');
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  ${r.url}  → ${r.reason} (status=${r.status})`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
