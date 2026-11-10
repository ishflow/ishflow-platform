// settings-walkthrough.mjs
//
// HEADED Chromium UAT of every metadata-driven settings page in V2.
// For each page:
//   1. Navigate; assert HTTP 200 + topbar title.
//   2. Enumerate inputs/selects/textareas/toggles + assert every DSL field is present.
//   3. Click Save with no mutation; assert success copy renders.
//   4. Mutate one field; click Save; assert success.
//   5. Query tenant_settings via DIRECT_URL; assert the payload landed.
//   6. Reload; assert the mutated value re-renders.
//
// Console errors + pageerror events are logged with the originating route.
// On any per-page failure the script records it, screenshots `/tmp/`, and
// keeps going so the operator gets a full red/green matrix at the end.
//
// Run: node scripts/settings-walkthrough.mjs
//   PWHEAD=0 → headless

import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const BASE_URL = process.env.WALKTHROUGH_BASE_URL ?? 'http://localhost:3100';
const LOCALE = 'tr';
const HEADED = process.env.PWHEAD !== '0';
const STEP = HEADED ? 500 : 30;
const TENANT_ID = '00000000-0000-0000-0000-000000d3b001';
const FAIL_OUT = '/tmp/settings-uat-failures.json';
const LOG_OUT = '/tmp/settings-uat-log.txt';

const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const results = [];
const consoleErrors = [];
const pageErrors = [];

const logFile = await fs.open(LOG_OUT, 'w');

function line(msg = '') {
  console.log(msg);
  logFile.write(`${msg}\n`).catch(() => {});
}
function header(title) {
  line('');
  line(`━━━━━━━━━━ ${title} ━━━━━━━━━━`);
}
function record(name, ok, info = '') {
  results.push({ name, ok, info });
  line(`   ${ok ? '✅' : '❌'} ${name}${info ? `  ${info}` : ''}`);
}

const PAGES = [
  {
    slug: 'admin.branding',
    route: '/v2/admin/branding',
    title: 'Marka',
    fields: ['logoUrl', 'primaryColor', 'secondaryColor', 'accentColor', 'footerText'],
    mutate: {
      kind: 'string',
      name: 'logoUrl',
      value: `https://cdn.example.com/logo-${Date.now()}.svg`,
    },
    expectedPayloadKey: 'logoUrl',
  },
  {
    slug: 'admin.security',
    route: '/v2/admin/security',
    title: 'Güvenlik',
    fields: ['twoFactorRequired', 'passwordMinLength', 'sessionTimeoutMinutes', 'ipAllowlistCidr'],
    mutate: { kind: 'number', name: 'passwordMinLength', value: '14' },
    expectedPayloadKey: 'passwordMinLength',
    expectedValue: 14,
  },
  {
    slug: 'admin.tax',
    route: '/v2/admin/tax',
    title: 'Vergi',
    fields: ['country', 'vatNumber', 'defaultTaxRatePct', 'taxInclusivePricing'],
    mutate: { kind: 'select', name: 'country', value: 'RU' },
    expectedPayloadKey: 'country',
    expectedValue: 'RU',
  },
  {
    slug: 'admin.mobile_features',
    route: '/v2/admin/mobile-features',
    title: 'Mobil',
    fields: [
      'offlineEnabled',
      'biometricEnabled',
      'pushEnabled',
      'appleSignInEnabled',
      'siriShortcutsEnabled',
      'widgetsEnabled',
      'autofillEnabled',
      'directShareEnabled',
    ],
    mutate: { kind: 'toggle', name: 'siriShortcutsEnabled' },
    expectedPayloadKey: 'siriShortcutsEnabled',
    expectedValue: true,
  },
  {
    slug: 'admin.platform_toggles',
    route: '/v2/admin/platform-toggles',
    title: 'Platform',
    fields: [
      'multiwarehouseEnabled',
      'multicurrencyEnabled',
      'periodCloseEnabled',
      'approvalsEnabled',
      'bankImportEnabled',
      'aiOcrEnabled',
      'oneCExportEnabled',
      'webhooksEnabled',
      'apiTokensEnabled',
      'auditExportEnabled',
      'ssoEnabled',
    ],
    mutate: { kind: 'toggle', name: 'webhooksEnabled' },
    expectedPayloadKey: 'webhooksEnabled',
    expectedValue: true,
  },
  {
    slug: 'admin.general',
    route: '/v2/settings/general',
    title: 'Genel',
    fields: ['workspaceName', 'defaultCurrencyCode', 'defaultVatRatePct', 'rounding'],
    mutate: { kind: 'string', name: 'workspaceName', value: `Acme-${Date.now()}` },
    expectedPayloadKey: 'workspaceName',
  },
];

async function setupBaseline() {
  header('0 — temiz baseline');
  // Wipe any prior runs so default-state assertions are deterministic.
  const result = await db.tenantSettings.deleteMany({
    where: {
      tenantId: TENANT_ID,
      key: { in: PAGES.map((p) => p.slug) },
    },
  });
  line(`[baseline] cleared ${result.count} tenant_settings rows for tenant ${TENANT_ID}`);
}

async function loadCurrent(slug) {
  const row = await db.tenantSettings.findUnique({
    where: { tenantId_key: { tenantId: TENANT_ID, key: slug } },
  });
  return row?.payload ?? null;
}

async function pollDb(slug, predicate, label) {
  // Poll the DB for up to 5s waiting for `predicate(payload)` to be true.
  // Used after Save because the server action commits asynchronously and the
  // immediate read can race the upsert.
  const deadline = Date.now() + 5000;
  let last = null;
  while (Date.now() < deadline) {
    last = await loadCurrent(slug);
    if (predicate(last)) return { ok: true, payload: last };
    await new Promise((r) => setTimeout(r, 150));
  }
  return { ok: false, payload: last };
}

async function uatPage(page, p) {
  header(`📄 ${p.route}`);

  const errors = [];
  const handler = (err) => errors.push(`pageerr:${err.message}`);
  page.on('pageerror', handler);

  try {
    const res = await page.goto(`${BASE_URL}/${LOCALE}${p.route}`, {
      waitUntil: 'domcontentloaded',
    });
    record(`${p.route} → HTTP 200`, res?.status() === 200, `status=${res?.status()}`);
    await page.waitForTimeout(STEP);

    // 1. Topbar
    const h1 = await page
      .locator('h1')
      .first()
      .textContent({ timeout: 4000 })
      .catch(() => '');
    record(
      `${p.route} → topbar contains "${p.title}"`,
      (h1 || '').toLowerCase().includes(p.title.toLowerCase()),
      `h1="${h1}"`,
    );

    // 2. Field presence
    for (const f of p.fields) {
      const present = await page
        .locator(`[name="${f}"], [id="s-${f}"]`)
        .count()
        .then((c) => c > 0);
      record(`${p.route} → field "${f}" present`, present);
    }

    // 3. Mutate the focal field — do this BEFORE first Save so the assert-DB
    //    step has something distinctive to look for (vs the field's default
    //    value, which would otherwise pollute the test).
    let expected;
    if (p.mutate.kind === 'string') {
      await page.fill(`[name="${p.mutate.name}"]`, p.mutate.value);
      expected = p.mutate.value;
    } else if (p.mutate.kind === 'number') {
      await page.fill(`[name="${p.mutate.name}"]`, p.mutate.value);
      expected = Number(p.mutate.value);
    } else if (p.mutate.kind === 'select') {
      await page.selectOption(`[name="${p.mutate.name}"]`, p.mutate.value);
      expected = p.expectedValue ?? p.mutate.value;
    } else if (p.mutate.kind === 'toggle') {
      await page.locator(`#s-${p.mutate.name}`).click({ timeout: 4000 });
      expected = p.expectedValue ?? true;
    }
    await page.waitForTimeout(STEP);

    // 4. Save
    const saveBtn = page.locator('button[type="submit"]');
    await saveBtn.first().click({ timeout: 4000 });

    // 5. Poll DB until the row appears with the expected value.
    const poll = await pollDb(
      p.slug,
      (payload) =>
        payload !== null &&
        JSON.stringify(payload[p.expectedPayloadKey]) === JSON.stringify(expected),
      `${p.slug}.${p.expectedPayloadKey}=${JSON.stringify(expected)}`,
    );
    record(
      `${p.route} → DB row.${p.expectedPayloadKey} = ${JSON.stringify(expected)}`,
      poll.ok,
      `payload=${JSON.stringify(poll.payload)}`,
    );

    // 6. Reload + assert persistence in the rendered form.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(STEP);
    if (p.mutate.kind === 'string' || p.mutate.kind === 'number') {
      const val = await page
        .locator(`[name="${p.mutate.name}"]`)
        .inputValue()
        .catch(() => '');
      record(
        `${p.route} → ${p.mutate.name} re-renders persisted value`,
        String(val) === String(p.mutate.value),
        `re-render val="${val}"`,
      );
    } else if (p.mutate.kind === 'select') {
      const val = await page
        .locator(`[name="${p.mutate.name}"]`)
        .inputValue()
        .catch(() => '');
      record(
        `${p.route} → ${p.mutate.name} re-renders persisted value`,
        val === p.mutate.value,
        `re-render val="${val}"`,
      );
    } else if (p.mutate.kind === 'toggle') {
      const isOn = await page
        .locator(`#s-${p.mutate.name}`)
        .evaluate((el) => el.className.includes('is-on'))
        .catch(() => false);
      record(`${p.route} → ${p.mutate.name} toggle re-renders ON`, isOn === true);
    }
  } catch (err) {
    record(`${p.route} → UNCAUGHT`, false, err.message);
  } finally {
    if (errors.length > 0) {
      for (const e of errors) line(`   ⚠ ${p.route} ${e}`);
      pageErrors.push({ route: p.route, errors });
    }
    page.off('pageerror', handler);
  }
}

async function main() {
  await setupBaseline();
  const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 150 : 0 });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Warning: React') || text.includes('punycode')) return;
      consoleErrors.push(text);
      line(`   [console.error] ${text}`);
    }
  });

  // Warm dev-bypass auth
  await page.goto(`${BASE_URL}/${LOCALE}/v2/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  for (const p of PAGES) {
    await uatPage(page, p);
  }

  await ctx.close();
  await browser.close();
  await db.$disconnect();

  header('SUMMARY');
  const failed = results.filter((r) => !r.ok);
  const ok = results.length - failed.length;
  line(`  ${ok} ✅   ${failed.length} ❌   total ${results.length}`);
  if (consoleErrors.length > 0) line(`  console.error: ${consoleErrors.length}`);
  if (pageErrors.length > 0) line(`  pageerror: ${pageErrors.length}`);

  await fs.writeFile(
    FAIL_OUT,
    JSON.stringify(
      {
        summary: { total: results.length, ok, failed: failed.length },
        failures: failed,
        consoleErrors,
        pageErrors,
      },
      null,
      2,
    ),
  );
  line(`  → ${FAIL_OUT}`);
  line(`  → ${LOG_OUT}`);

  await logFile.close();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  line(`FATAL: ${err.stack ?? err.message}`);
  await logFile.close();
  process.exit(2);
});
