import fs from 'node:fs/promises';
// V0.12 UAT — verify brand palette (#0F5EEF / #B0E9FD / #000000 / #F4F4F4)
// is applied to the V2 CSS variable layer in both light and dark mode.
//
// Strategy:
//   1. Visit a public V2 page (landing) where .v2-app wrapper is mounted.
//   2. Read computed CSS variables from the .v2-app element via
//      getComputedStyle(...).getPropertyValue('--accent') etc.
//   3. Toggle the html.dark class and re-read the dark-mode values.
//
// We assert the actual brand hex values resolve — not the literal text in
// the stylesheet — so any indirection through aliases is verified.
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-v12-uat';
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

// Normalize browser-returned color to lowercase #rrggbb. Inputs we may see:
//   'rgb(15, 94, 239)', '#0f5eef', '#000' (Chrome collapses #000000 → #000).
function normHex(value) {
  const v = String(value).trim().toLowerCase();
  if (v.startsWith('#')) {
    if (v.length === 4) {
      // expand #rgb → #rrggbb
      return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    }
    return v;
  }
  const m = v.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return v;
  const hex = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}

async function readTokens() {
  return page.evaluate(() => {
    const el = document.querySelector('.v2-app');
    if (!el) throw new Error('.v2-app wrapper not found');
    const cs = getComputedStyle(el);
    const get = (name) => cs.getPropertyValue(name).trim();
    return {
      accent: get('--accent'),
      accentSoft: get('--accent-soft'),
      accentOn: get('--accent-on'),
      text: get('--text'),
      bgPage: get('--bg-page'),
      chartLine: get('--chart-line'),
      chartTooltipBg: get('--chart-tooltip-bg'),
      primary: get('--primary'),
      ring: get('--ring'),
    };
  });
}

// ─── Light mode tokens ────────────────────────────────────────────────────

await page.goto(`${BASE}/tr/v2`, { waitUntil: 'networkidle' });
// Force light: remove .dark on <html> if present.
await page.evaluate(() => document.documentElement.classList.remove('dark'));

const light = await readTokens();
console.log('  light tokens:', JSON.stringify(light));

await expect('light: --accent = #0f5eef (royal blue brand)', async () => {
  if (normHex(light.accent) !== '#0f5eef') throw new Error(`expected #0f5eef, got ${light.accent}`);
});

await expect('light: --accent-soft = #b0e9fd (ice from palette)', async () => {
  if (normHex(light.accentSoft) !== '#b0e9fd')
    throw new Error(`expected #b0e9fd, got ${light.accentSoft}`);
});

await expect('light: --text = #000000 (palette black)', async () => {
  if (normHex(light.text) !== '#000000') throw new Error(`expected #000000, got ${light.text}`);
});

await expect('light: --bg-page = #f4f4f4 (palette surface)', async () => {
  if (normHex(light.bgPage) !== '#f4f4f4') throw new Error(`expected #f4f4f4, got ${light.bgPage}`);
});

await expect('light: --chart-line = #0f5eef (everything blue)', async () => {
  if (normHex(light.chartLine) !== '#0f5eef')
    throw new Error(`expected #0f5eef, got ${light.chartLine}`);
});

await expect('light: --chart-tooltip-bg = #0f5eef', async () => {
  if (normHex(light.chartTooltipBg) !== '#0f5eef')
    throw new Error(`expected #0f5eef, got ${light.chartTooltipBg}`);
});

await expect('light: --primary alias resolves to brand blue', async () => {
  if (normHex(light.primary) !== '#0f5eef')
    throw new Error(`expected #0f5eef, got ${light.primary}`);
});

await expect('light: --ring (focus) resolves to brand blue', async () => {
  if (normHex(light.ring) !== '#0f5eef') throw new Error(`expected #0f5eef, got ${light.ring}`);
});

await expect('light: --accent-on = #ffffff (white text on blue)', async () => {
  if (normHex(light.accentOn) !== '#ffffff')
    throw new Error(`expected #ffffff, got ${light.accentOn}`);
});

// ─── Dark mode tokens ─────────────────────────────────────────────────────

await page.evaluate(() => document.documentElement.classList.add('dark'));
const dark = await readTokens();
console.log('  dark tokens:', JSON.stringify(dark));

await expect('dark: --accent brightened to #4b86f4 for AA contrast', async () => {
  if (normHex(dark.accent) !== '#4b86f4') throw new Error(`expected #4b86f4, got ${dark.accent}`);
});

await expect('dark: --accent-soft = #0a2540 (deep navy tint)', async () => {
  if (normHex(dark.accentSoft) !== '#0a2540')
    throw new Error(`expected #0a2540, got ${dark.accentSoft}`);
});

await expect('dark: --accent-on = #ffffff (white text on blue)', async () => {
  if (normHex(dark.accentOn) !== '#ffffff')
    throw new Error(`expected #ffffff, got ${dark.accentOn}`);
});

await expect('dark: --chart-line = #4b86f4', async () => {
  if (normHex(dark.chartLine) !== '#4b86f4')
    throw new Error(`expected #4b86f4, got ${dark.chartLine}`);
});

// ─── Visual smoke: brand-mark logo in marketing nav uses blue bg ─────────

await page.evaluate(() => document.documentElement.classList.remove('dark'));
await page.goto(`${BASE}/tr/v2`, { waitUntil: 'networkidle' });
await expect('public nav .brand-mark uses --accent (computed blue)', async () => {
  const bg = await page
    .locator('.v2-app .brand-mark')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  if (normHex(bg) !== '#0f5eef') throw new Error(`expected brand-mark bg #0f5eef, got ${bg}`);
});

await shot('public-landing-light');

await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.waitForTimeout(200);
await shot('public-landing-dark');

await fs.writeFile(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
await browser.close();

const total = findings.passed + findings.failed.length;
console.log(`\n${findings.passed}/${total} passed`);
if (findings.failed.length > 0) {
  for (const f of findings.failed) console.log(`  - ${f.step}: ${f.error}`);
  process.exit(1);
}
process.exit(0);
