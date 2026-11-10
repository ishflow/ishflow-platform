import fs from 'node:fs/promises';
// V0.10e UAT — verify list page mockup parity (text + columns).
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-v10e-uat';
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

async function bodyText() {
  return (await page.locator('body').textContent()) ?? '';
}

// ─── Purchase invoice list mockup parity ──────────────────────────────────

await expect('purchase-invoice: title + bilingual subtitle present', async () => {
  await page.goto(`${BASE}/tr/v2/purchases/purchase-invoice`, { waitUntil: 'networkidle' });
  const text = await bodyText();
  if (!text.includes('Alış Faturaları')) throw new Error('Title "Alış Faturaları" missing');
  if (!text.includes('Закупка фактуры')) throw new Error('Russian subtitle missing');
});

await expect('purchase-invoice: filter chips Tümü/Onaylı/Taslak/Reddedildi', async () => {
  const text = await bodyText();
  for (const lbl of ['Tümü', 'Onaylı', 'Taslak', 'Reddedildi']) {
    if (!text.includes(lbl)) throw new Error(`Filter "${lbl}" missing`);
  }
});

await expect('purchase-invoice: bilingual supplier column header', async () => {
  const text = await bodyText();
  if (!text.includes('Поставщик / Tedarikçi')) {
    throw new Error('Bilingual "Поставщик / Tedarikçi" column header missing');
  }
});

await expect('purchase-invoice: "Tutar" not "Toplam", "Yön" gone', async () => {
  const text = await bodyText();
  if (!text.includes('Tutar')) throw new Error('"Tutar" column header missing');
  // Headers should not include "Yön" (direction column removed per mockup).
  const headers = await page.locator('table.data thead th').allTextContents();
  if (headers.some((h) => h.includes('Yön'))) {
    throw new Error(`"Yön" column should NOT be in header. headers=${JSON.stringify(headers)}`);
  }
});

await expect('purchase-invoice: table status pills are Onaylı/Taslak (not Uygulandı)', async () => {
  // Only inspect the table cells, not the entire body (which may include i18n
  // artifacts from other namespaces).
  const cellLabels = await page.locator('table.data tbody td .pill').allTextContents();
  if (cellLabels.some((p) => p.includes('Uygulandı'))) {
    throw new Error(`Found "Uygulandı" in row pill: ${JSON.stringify(cellLabels)}`);
  }
});

await expect('purchase-invoice: no visible Hızlı/OCR button in toolbar', async () => {
  // Check only the visible toolbar buttons, not body text.
  const buttons = await page.locator('.table-toolbar .btn').allTextContents();
  if (buttons.some((b) => b.includes('Hızlı'))) {
    throw new Error(`Found Hızlı button: ${JSON.stringify(buttons)}`);
  }
});

await expect('purchase-invoice: "+ Yeni fatura" button (not "Yeni alış faturası")', async () => {
  const text = await bodyText();
  if (!text.includes('Yeni fatura')) throw new Error('"Yeni fatura" button missing');
});

await expect('purchase-invoice: date format like "DD MMM YYYY"', async () => {
  // Look for any date cell containing a 3-letter month abbreviation.
  // Turkish month abbrevs: Oca, Şub, Mar, Nis, May, Haz, Tem, Ağu, Eyl, Eki, Kas, Ara
  const cells = await page.locator('table.data tbody td').allTextContents();
  const dateLike = cells.find((c) =>
    /^\d{1,2}\s(Oca|Şub|Mar|Nis|May|Haz|Tem|Ağu|Eyl|Eki|Kas|Ara)\s\d{4}/.test(c.trim()),
  );
  if (!dateLike) {
    throw new Error(
      'No row matches "DD MMM YYYY" format. Sample cells: ' + cells.slice(0, 5).join('|'),
    );
  }
});

await expect('purchase-invoice: currency in "$X.XX" en-US format', async () => {
  const cells = await page.locator('table.data tbody td.num').allTextContents();
  const moneyLike = cells.find((c) => /^\$\d[\d,]*\.\d{2}$/.test(c.trim()));
  if (!moneyLike) {
    throw new Error(
      'No row matches "$X,XXX.XX" en-US currency. Sample: ' + cells.slice(0, 5).join('|'),
    );
  }
});

// ─── Sales invoice list mockup parity ─────────────────────────────────────

await expect('sales-invoice: title + bilingual subtitle present', async () => {
  await page.goto(`${BASE}/tr/v2/documents/sales-invoice`, { waitUntil: 'networkidle' });
  const text = await bodyText();
  if (!text.includes('Satış Faturaları')) throw new Error('Title missing');
  if (!text.includes('Реализация')) throw new Error('Russian subtitle missing');
});

await expect('sales-invoice: bilingual customer column header', async () => {
  const text = await bodyText();
  if (!text.includes('Покупатель / Müşteri')) throw new Error('Bilingual customer header missing');
});

await expect('sales-invoice: "Fiyat türü" column present', async () => {
  const headers = await page.locator('table.data thead th').allTextContents();
  if (!headers.some((h) => h.includes('Fiyat türü'))) {
    throw new Error(`"Fiyat türü" column missing. headers=${JSON.stringify(headers)}`);
  }
});

await expect('sales-invoice: "+ Yeni satış" button per mockup', async () => {
  const text = await bodyText();
  if (!text.includes('Yeni satış')) throw new Error('"Yeni satış" button missing');
});

// ─── Payment-received list mockup parity ──────────────────────────────────

await expect('payment-received: title + RU subtitle Поступление денег', async () => {
  await page.goto(`${BASE}/tr/v2/documents/payment-received`, { waitUntil: 'networkidle' });
  const text = await bodyText();
  if (!text.includes('Ödeme Tahsilatları')) throw new Error('Title missing');
  if (!text.includes('Поступление денег')) throw new Error('Russian subtitle missing');
});

// ─── Payment-sent list mockup parity ──────────────────────────────────────

await expect('payment-sent: title + RU subtitle Списание денег', async () => {
  await page.goto(`${BASE}/tr/v2/purchases/payment-sent`, { waitUntil: 'networkidle' });
  const text = await bodyText();
  if (!text.includes('Tedarikçi Ödemeleri')) throw new Error('Title missing');
  if (!text.includes('Списание денег')) throw new Error('Russian subtitle missing');
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
