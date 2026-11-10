import fs from 'node:fs/promises';
import path from 'node:path';
// V2 V0.5 interactive test pass.
//
// Phase A (always): navigate every V2 route in /tmp/v2-smoke/routes.txt with a
//   single reusable tab, capture status/finalUrl/h1/console/pageError/screenshot.
// Phase B (form submit): hit the 8 wired V0.5 create routes, fill the required
//   fields with deterministic placeholders, submit, and record the outcome.
// Phase C (i18n): visit /tr/v2/dashboard, /en/v2/dashboard, /ru/v2/dashboard and
//   look for visible "v2_xxx.yyy" leftover keys.
//
// Output (/tmp/v2-test-pass/):
//   - results.json          (Phase A raw signals per route)
//   - submits.json          (Phase B raw signals per submitted form)
//   - i18n.json             (Phase C leftover key probe)
//   - shots/<route>.png     (full-page screenshot per route)
//   - run.log               (stdout tee for review)
//
// Run: node scripts/v2-test-pass.mjs
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-test-pass';
const STORAGE = `${OUT}/storage.json`;
const SHOTS = `${OUT}/shots`;
const ROUTES = (await fs.readFile('/tmp/v2-smoke/routes.txt', 'utf8')).trim().split('\n');

// Guard: ensure we are actually testing V2.
const nonV2 = ROUTES.filter((r) => !r.startsWith('/tr/v2'));
if (nonV2.length) {
  console.error('[abort] non-V2 routes found in routes.txt:', nonV2);
  process.exit(1);
}

await fs.mkdir(SHOTS, { recursive: true });

const stamp = Date.now().toString(36);
const u = (s) => `${s}-${stamp}`;

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: STORAGE,
});
const page = await ctx.newPage();

// Console + page error sinks rebind per route.
let consoleSink = [];
let errorSink = [];
let networkSink = [];

page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    consoleSink.push({ type: msg.type(), text: msg.text().slice(0, 400) });
  }
});
page.on('pageerror', (err) => errorSink.push(String(err).slice(0, 400)));
page.on('response', (resp) => {
  const url = resp.url();
  // Only track relevant origin
  if (!url.startsWith(BASE)) return;
  const status = resp.status();
  if (status >= 400) {
    networkSink.push({ url: url.replace(BASE, ''), status });
  }
});

function resetSinks() {
  consoleSink = [];
  errorSink = [];
  networkSink = [];
}

function shotName(route) {
  return route.replace(/[/]/g, '_').replace(/^_/, '') || 'root';
}

async function navigate(route, { settleMs = 600 } = {}) {
  resetSinks();
  const url = BASE + route;
  let status = null;
  let finalUrl = null;
  let title = null;
  let h1 = null;
  let nav_error = null;
  const started = Date.now();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = resp ? resp.status() : null;
    await page.waitForTimeout(settleMs);
    finalUrl = page.url();
    title = await page.title().catch(() => null);
    h1 = await page.$eval('h1', (el) => el.textContent?.trim().slice(0, 120)).catch(() => null);
  } catch (e) {
    nav_error = String(e).slice(0, 400);
  }
  return {
    route,
    status,
    finalUrl,
    title,
    h1,
    nav_error,
    redirected: finalUrl && finalUrl !== url,
    took_ms: Date.now() - started,
    consoleErrors: consoleSink.filter((c) => c.type === 'error').slice(0, 5),
    consoleWarnings: consoleSink.filter((c) => c.type === 'warning').slice(0, 5),
    pageErrors: errorSink.slice(0, 3),
    networkErrors: networkSink.slice(0, 5),
  };
}

async function screenshot(route) {
  const p = path.join(SHOTS, `${shotName(route)}.png`);
  try {
    await page.screenshot({ path: p, fullPage: true });
    return p;
  } catch {
    return null;
  }
}

function bucket(r) {
  if (r.nav_error) return 'nav_fail';
  if (r.status && r.status >= 500) return 'server_error';
  if (r.status === 404) return 'not_found';
  if (r.pageErrors.length) return 'page_error';
  if (r.networkErrors.length) return 'network_error';
  if (/sign-in|signin|auth/.test(r.finalUrl ?? '') && !/v2\/sign-in/.test(r.route))
    return 'auth_redirect';
  if (r.consoleErrors.length) return 'console_error';
  if (!r.h1 && !r.title) return 'empty';
  return 'ok';
}

// ---------- Phase A — route scan ----------
console.log(`[A] scanning ${ROUTES.length} V2 routes…`);
const results = [];
let i = 0;
for (const route of ROUTES) {
  i++;
  const r = await navigate(route);
  r.shot = await screenshot(route);
  r.bucket = bucket(r);
  results.push(r);
  const tag = r.bucket === 'ok' ? '✓' : r.bucket === 'auth_redirect' ? '↻' : '✗';
  console.log(
    `${tag} ${String(i).padStart(3)}/${ROUTES.length} ${r.bucket.padEnd(14)} ${
      r.status ?? '---'
    }  ${route}`,
  );
}
await fs.writeFile(`${OUT}/results.json`, JSON.stringify(results, null, 2));

// ---------- Phase B — wired form submits ----------
//
// 8 wired V0.5 create forms. Selector strategy: fill by input name attribute.
const wired = [
  {
    route: '/tr/v2/catalogs/products/new',
    fill: {
      name: u('Test-Ürün'),
      costPrice: '10',
      listPrice: '15',
      minStock: '0',
      maxStock: '100',
      description: 'auto-generated',
    },
  },
  {
    route: '/tr/v2/catalogs/partners/customers/new',
    fill: { name: u('Test-Müşteri'), tin: '1234567890', phone: '+90 555 000 00 00' },
  },
  {
    route: '/tr/v2/catalogs/partners/suppliers/new',
    fill: { name: u('Test-Tedarikçi'), tin: '0987654321', phone: '+90 555 111 11 11' },
  },
  {
    route: '/tr/v2/catalogs/price-types/new',
    fill: { code: u('PT'), name: u('Test-Fiyat-Tipi'), description: 'auto' },
  },
  {
    route: '/tr/v2/admin/members/invite',
    fill: { email: `bot-${stamp}@example.com` },
  },
  {
    route: '/tr/v2/admin/roles/new',
    fill: { code: u('TROLE'), name: u('Test-Rol'), description: 'auto' },
  },
  {
    route: '/tr/v2/admin/currencies/new',
    fill: { code: `TC${Math.floor(Math.random() * 90) + 10}`, name: u('Test-Para') },
  },
  {
    route: '/tr/v2/catalogs/warehouses/new',
    fill: { code: u('WH'), name: u('Test-Depo'), address: 'auto' },
  },
];

console.log(`\n[B] submitting ${wired.length} wired forms…`);
const submits = [];
for (const w of wired) {
  resetSinks();
  const r = await navigate(w.route, { settleMs: 800 });
  const filled = {};
  let submitError = null;
  if (!r.nav_error && r.status && r.status < 400) {
    for (const [name, value] of Object.entries(w.fill)) {
      try {
        const sel = `[name="${name}"]`;
        const exists = await page.$(sel);
        if (exists) {
          const tag = await exists.evaluate((el) => el.tagName).catch(() => null);
          if (tag === 'SELECT') {
            await exists.selectOption(value).catch(() => null);
          } else {
            // Avoid clobbering disabled fields.
            const disabled = await exists.evaluate((el) => el.disabled).catch(() => false);
            if (!disabled) await exists.fill(String(value)).catch(() => null);
          }
          filled[name] = value;
        }
      } catch (e) {
        submitError = String(e).slice(0, 300);
      }
    }
    // Try to click submit
    try {
      const before = page.url();
      // Prefer button[type=submit], then any button with the word Kaydet/Save
      let btn = await page.$('button[type="submit"]');
      if (!btn) btn = await page.$('button:has-text("Kaydet")');
      if (!btn) btn = await page.$('button:has-text("Save")');
      if (!btn) btn = await page.$('button:has-text("Davet")');
      if (btn) {
        await btn.click({ trial: false }).catch(() => null);
        await page.waitForTimeout(1500);
      } else {
        submitError = 'submit-button-not-found';
      }
      const after = page.url();
      r.submittedFrom = before;
      r.submittedTo = after;
    } catch (e) {
      submitError = String(e).slice(0, 300);
    }
  }
  await screenshot(`${w.route}-after-submit`);
  const submittedFrom = r.submittedFrom ?? BASE + w.route;
  const submittedTo = r.submittedTo ?? submittedFrom;
  const success =
    submittedTo !== submittedFrom &&
    !submittedTo.endsWith('/new') &&
    !submittedTo.endsWith('/invite');
  const formErrorsAfterSubmit = await page
    .$$eval('.field-error, .form-error', (els) =>
      els.map((e) => (e.textContent ?? '').trim()).filter(Boolean),
    )
    .catch(() => []);
  submits.push({
    route: w.route,
    filled,
    submittedFrom,
    submittedTo,
    success,
    formErrorsAfterSubmit,
    networkErrors: networkSink.slice(0, 5),
    pageErrors: errorSink.slice(0, 3),
    consoleErrors: consoleSink.filter((c) => c.type === 'error').slice(0, 5),
    submitError,
    finalH1: await page.$eval('h1', (el) => el.textContent?.trim().slice(0, 120)).catch(() => null),
  });
  console.log(
    `${success ? '✓' : '✗'} submit ${w.route} → ${r.submittedTo ?? '(no nav)'} ${
      submitError ? `[${submitError}]` : ''
    }`,
  );
}
await fs.writeFile(`${OUT}/submits.json`, JSON.stringify(submits, null, 2));

// ---------- Phase C — i18n leftover key probe ----------
console.log('\n[C] i18n leftover key probe…');
const probes = [
  '/tr/v2/dashboard',
  '/en/v2/dashboard',
  '/ru/v2/dashboard',
  '/tr/v2/catalogs/products',
  '/tr/v2/catalogs/partners/customers',
  '/tr/v2/documents/sales-invoice',
  '/tr/v2/purchases/purchase-invoice',
  '/tr/v2/registers/sales',
  '/tr/v2/reports/turnover',
  '/tr/v2/settings',
  '/tr/v2/settings/billing',
  '/tr/v2/admin/audit',
  '/tr/v2/admin/roles/sample-id',
  '/tr/v2/admin/members',
  '/tr/v2/super-admin/dashboard',
  '/tr/v2/super-admin/tenants',
  '/tr/v2/super-admin/cms/blog',
  '/tr/v2/about',
  '/tr/v2/pricing',
  '/tr/v2/onboarding/welcome',
];
const leftoverKey = /\bv2_[a-z][a-z0-9_]+\.[a-z][a-z0-9_.]+/gi;
const i18n = [];
for (const p of probes) {
  const r = await navigate(p, { settleMs: 800 });
  const text = await page.evaluate(() => document.body.innerText).catch(() => '');
  const matches = Array.from(new Set((text || '').match(leftoverKey) ?? [])).slice(0, 25);
  i18n.push({ route: p, status: r.status, finalUrl: r.finalUrl, leftoverKeys: matches });
  console.log(`${matches.length === 0 ? '✓' : '✗'} ${p} ${matches.length} leftover`);
}
await fs.writeFile(`${OUT}/i18n.json`, JSON.stringify(i18n, null, 2));

// ---------- Summary ----------
const groups = {};
for (const r of results) groups[r.bucket] = (groups[r.bucket] ?? 0) + 1;
console.log('\n=== A: route summary ===');
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(15)} ${v}`);
}
console.log('\n=== B: submit summary ===');
for (const s of submits) console.log(`  ${s.success ? 'OK ' : 'FAIL'} ${s.route}`);
console.log('\n=== C: i18n leftovers ===');
for (const p of i18n) console.log(`  ${p.leftoverKeys.length} ${p.route}`);

await ctx.close();
await browser.close();
console.log(`\nWrote: ${OUT}/results.json ${OUT}/submits.json ${OUT}/i18n.json (+shots/)`);
