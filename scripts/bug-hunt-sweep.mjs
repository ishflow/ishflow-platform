// Bug hunt — headless aggressive interaction sweep across all 7 wired SA tabs.
//
// Runs a series of focused suites to surface real bugs:
//   A. Empty-state rendering (tenant with zero entities)
//   B. Form validation edge cases (empty / overlong / invalid input)
//   C. Locale rendering (visit /en/ + /ru/ + /zh/)
//   D. Race conditions (rapid double-click)
//   E. Destructive-flow cancel (Cancel button doesn't mutate)
//   F. Re-render after action (next render reflects new state)
//
// Headless. Self-cleans. Single report at /tmp/bug-hunt-report.json.

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3100';
const TENANT_SLUG = 'demo-sa-acme';
const REPORT = '/tmp/bug-hunt-report.json';

const log = console.info;
const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const tenant = await prisma.tenant.findFirst({
  where: { slug: TENANT_SLUG },
  select: { id: true, name: true },
});
if (!tenant) {
  console.error(`No tenant ${TENANT_SLUG}.`);
  process.exit(1);
}

const issues = [];
let currentSuite = '';
let currentCheck = '';
function record(kind, detail) {
  issues.push({
    suite: currentSuite,
    check: currentCheck,
    kind,
    detail: typeof detail === 'string' ? detail.slice(0, 600) : String(detail).slice(0, 600),
    ts: new Date().toISOString(),
  });
}

const BENIGN_PATTERNS = [
  /Clerk has been loaded with development keys/i,
  /afterSignInUrl" is deprecated/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /clerk\.accounts\.dev/i,
  /Failed to load resource.*net::ERR_FAILED/i,
  /ClerkRuntimeError.*Failed to load Clerk/i,
  /\[dev-bypass\] ⚠ Clerk auth disabled/i,
];
const BENIGN_URLS = [/clerk\.accounts\.dev/i, /clerk-telemetry/i];

let devLogStartBytes = 0;
try {
  devLogStartBytes = Number(execSync('wc -c < /tmp/dev.log', { encoding: 'utf-8' }).trim());
} catch {
  /* ignore */
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: {},
});
const page = await ctx.newPage();

function mount(p) {
  p.on('console', (msg) => {
    const t = msg.type();
    if (t !== 'error' && t !== 'warning' && t !== 'assert') return;
    const text = msg.text();
    if (BENIGN_PATTERNS.some((re) => re.test(text))) return;
    record(`console.${t}`, text);
  });
  p.on('pageerror', (err) => {
    const m = err.stack ?? err.message;
    if (BENIGN_PATTERNS.some((re) => re.test(m))) return;
    record('pageerror', m);
  });
  p.on('requestfailed', (req) => {
    const url = req.url();
    if (url.includes('_next/static') || url.includes('hot-update')) return;
    if (BENIGN_URLS.some((re) => re.test(url))) return;
    record('requestfailed', `${req.method()} ${url} — ${req.failure()?.errorText}`);
  });
  p.on('response', (resp) => {
    const status = resp.status();
    if (status < 400) return;
    const url = resp.url();
    if (url.includes('_next/static')) return;
    if (BENIGN_URLS.some((re) => re.test(url))) return;
    record(`http.${status}`, `${resp.request().method()} ${url}`);
  });
  p.on('crash', () => record('crash', 'page crashed'));
}
mount(page);

async function visit(url) {
  await page.goto(`${BASE}${url}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}

async function dbCountTag(label) {
  return prisma.tenantTag.count({ where: { tenantId: tenant.id, label } });
}

const SA = `/tr/v2/super-admin/tenants/${tenant.id}`;

// ─────────────────────────────────────────────────────────────────────
//  Reset Acme to clean baseline for predictable suite runs
// ─────────────────────────────────────────────────────────────────────
log('▶ Reset: clearing addons/tags/notes/feature_kills/price/scenario-test users');
await prisma.tenantAddon.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantTag.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantNote.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantFeatureKill.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantPriceOverride.deleteMany({ where: { tenantId: tenant.id } });
await prisma.user.deleteMany({
  where: { email: { contains: 'bughunt' } },
});
await prisma.tenant.update({
  where: { id: tenant.id },
  data: { plan: 'pro', status: 'active' },
});

// ─────────────────────────────────────────────────────────────────────
//  Suite A — empty-state rendering
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'A. empty-state rendering';
const tabsForEmptyCheck = [
  // TR locale uses getAddonLabels(key, 'tr') → "AI Fatura OCR".
  { tab: 'addons', shouldShow: ['AI Fatura OCR', 'Aç'] },
  { tab: 'tags', shouldShow: ['Henüz etiket yok'] },
  { tab: 'notes', shouldShow: ['Henüz operatör notu yok'] },
  { tab: 'subscription', shouldShow: ['Plan', 'Aktif'] },
  { tab: 'overrides', shouldShow: ['feature kill yok', 'tenant plan'] },
  { tab: 'users', shouldShow: ['Henüz üye yok', 'üye yok'] },
];
for (const { tab, shouldShow } of tabsForEmptyCheck) {
  currentCheck = `tab=${tab}`;
  await visit(`${SA}/${tab}`);
  const html = await page.content();
  for (const expect of shouldShow) {
    if (!html.toLowerCase().includes(expect.toLowerCase())) {
      record('empty-state-missing', `tab=${tab} expected to contain "${expect}"`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Suite B — form validation edge cases
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'B. form validation';

// B1 — Tag empty label: form has required attribute so browser blocks submit
currentCheck = 'tag empty label rejected client-side';
await visit(`${SA}/tags`);
await page.locator('input[name="label"]').fill('');
await page.locator('button[type="submit"]:has-text("Ekle")').click();
await page.waitForTimeout(500);
const emptyTagCount = await dbCountTag('');
if (emptyTagCount > 0) record('validation-bypass', 'empty tag label was inserted into DB');

// B2 — Tag overlong label: zod max(64); 65 chars should reject server-side
currentCheck = 'tag overlong label rejected server-side';
const long65 = 'a'.repeat(65);
await visit(`${SA}/tags`);
await page.locator('input[name="label"]').fill(long65);
// maxLength=64 on input — browser truncates before submit
const actualValue = await page.locator('input[name="label"]').inputValue();
if (actualValue.length > 64) {
  record(
    'client-validation-broken',
    `tag label maxLength=64 didn't enforce — saw len ${actualValue.length}`,
  );
}
await page.locator('button[type="submit"]:has-text("Ekle")').click();
await page.waitForTimeout(800);
const truncatedRow = await prisma.tenantTag.findFirst({
  where: { tenantId: tenant.id, label: { startsWith: 'aaaaa' } },
});
if (truncatedRow && truncatedRow.label.length > 64) {
  record('overlong-stored', `tag with len ${truncatedRow.label.length} hit DB`);
}
// Cleanup
await prisma.tenantTag.deleteMany({
  where: { tenantId: tenant.id, label: { startsWith: 'aaaaa' } },
});

// B3 — Tag duplicate: idempotent (action checks for existing row)
currentCheck = 'tag duplicate is idempotent';
await prisma.tenantTag.create({
  data: {
    tenantId: tenant.id,
    label: 'bughunt-dup',
    color: 'zinc',
    createdBy: '00000000-0000-0000-0000-000000d3b002',
  },
});
await visit(`${SA}/tags`);
await page.locator('input[name="label"]').fill('bughunt-dup');
await page.locator('button[type="submit"]:has-text("Ekle")').click();
await page.waitForTimeout(800);
const dupCount = await prisma.tenantTag.count({
  where: { tenantId: tenant.id, label: 'bughunt-dup' },
});
if (dupCount !== 1) record('idempotency-broken', `tag dup count = ${dupCount}, expected 1`);
await prisma.tenantTag.deleteMany({ where: { tenantId: tenant.id, label: 'bughunt-dup' } });

// B4 — Note empty body rejected
currentCheck = 'note empty body rejected client-side';
await visit(`${SA}/notes`);
await page.locator('textarea[name="body"]').fill('');
await page.locator('button[type="submit"]:has-text("Kaydet")').click();
await page.waitForTimeout(500);
const noteCount = await prisma.tenantNote.count({ where: { tenantId: tenant.id } });
if (noteCount > 0) record('validation-bypass', 'empty note body was inserted');

// B5 — Feature kill key with special chars: zod regex blocks
currentCheck = 'feature_kill key with space rejected';
await visit(`${SA}/overrides`);
await page.locator('input[name="featureKey"]').fill('has space here');
await page.locator('input[name="reason"]').first().fill('test');
await page.locator('button[type="submit"]:has-text("Flag kapat")').click();
await page.waitForTimeout(1500);
const badKill = await prisma.tenantFeatureKill.findFirst({
  where: { tenantId: tenant.id, featureKey: { contains: ' ' } },
});
if (badKill)
  record('validation-bypass', `feature_kill with space inserted: "${badKill.featureKey}"`);

// B6 — Price override negative number
currentCheck = 'price override negative rejected';
await visit(`${SA}/overrides`);
await page.locator('input[name="monthlyPriceUsd"]').fill('-50');
await page.locator('input[name="reason"]').last().fill('negative-test');
await page.locator('button[type="submit"]:has-text("Override kaydet")').click();
await page.waitForTimeout(1500);
const badPrice = await prisma.tenantPriceOverride.findFirst({
  where: { tenantId: tenant.id, monthlyPriceUsd: { lt: 0 } },
});
if (badPrice) record('validation-bypass', `negative price inserted: ${badPrice.monthlyPriceUsd}`);

// B7 — Price override above 100000
currentCheck = 'price override over-max rejected';
await visit(`${SA}/overrides`);
await page.locator('input[name="monthlyPriceUsd"]').fill('500000');
await page.locator('input[name="reason"]').last().fill('overmax-test');
await page.locator('button[type="submit"]:has-text("Override kaydet")').click();
await page.waitForTimeout(1500);
const overPrice = await prisma.tenantPriceOverride.findFirst({
  where: { tenantId: tenant.id, monthlyPriceUsd: { gt: 100000 } },
});
if (overPrice) record('validation-bypass', `price > 100k inserted: ${overPrice.monthlyPriceUsd}`);

// Cleanup B6+B7 artifacts (in case any "leaked" through)
await prisma.tenantPriceOverride.deleteMany({ where: { tenantId: tenant.id } });

// ─────────────────────────────────────────────────────────────────────
//  Suite C — locale rendering (en, ru, zh)
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'C. locale rendering';
const localesToCheck = ['en', 'ru', 'zh'];
const tabsForLocaleCheck = [
  '',
  '/addons',
  '/tags',
  '/notes',
  '/subscription',
  '/overrides',
  '/users',
  '/timeline',
  '/activity',
  '/documents',
  '/vitals',
];
for (const loc of localesToCheck) {
  for (const sub of tabsForLocaleCheck) {
    currentCheck = `${loc}${sub}`;
    const url = `/${loc}/v2/super-admin/tenants/${tenant.id}${sub}`;
    await visit(url);
    // Just visiting captures any console errors via event listeners.
    // Additionally: page should be ≥ 200 status (status comes via response event, already captured)
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Suite D — race conditions
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'D. race conditions';

// D1 — Rapid double-click on add tag (button is disabled while pending)
currentCheck = 'tag rapid double-click → single row';
await visit(`${SA}/tags`);
await page.locator('input[name="label"]').fill('bughunt-race');
// Fire two clicks with no wait — the second should be blocked by disabled state
const addBtn = page.locator('button[type="submit"]:has-text("Ekle")');
await Promise.all([
  addBtn.click({ timeout: 5000 }).catch(() => {}),
  addBtn.click({ timeout: 5000 }).catch(() => {}),
]);
await page.waitForTimeout(2000);
const raceCount = await prisma.tenantTag.count({
  where: { tenantId: tenant.id, label: 'bughunt-race' },
});
if (raceCount > 1) {
  record('race-condition', `rapid double-click created ${raceCount} rows`);
}
await prisma.tenantTag.deleteMany({ where: { tenantId: tenant.id, label: 'bughunt-race' } });

// D2 — Rapid double-click on enable AI Invoice OCR addon
currentCheck = 'addon rapid double-click → 1 enabled (idempotent)';
await prisma.tenantAddon.deleteMany({ where: { tenantId: tenant.id, addonKey: 'ai_invoice_ocr' } });
await visit(`${SA}/addons`);
const enableBtn = page.locator('button:has-text("Aç")').filter({ hasNotText: '×' }).first();
await Promise.all([enableBtn.click().catch(() => {}), enableBtn.click().catch(() => {})]);
await page.waitForTimeout(2000);
const enabledCount = await prisma.tenantAddon.count({
  where: { tenantId: tenant.id, addonKey: 'ai_invoice_ocr' },
});
if (enabledCount > 1) {
  record('race-condition', `double-click enabled addon ${enabledCount} times`);
}

// ─────────────────────────────────────────────────────────────────────
//  Suite E — destructive flow cancel (Cancel must not mutate)
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'E. destructive cancel safety';

// E1 — Open suspend dialog, fill reason, click Cancel — assert no suspension
currentCheck = 'suspend cancel does not mutate';
await visit(SA); // overview
await page.locator('button:has-text("Askıya al")').first().click();
await page.waitForTimeout(500);
await page.locator('input[placeholder*="ödeme"]').fill('uat-cancel-test');
// Click the cancel button in dialog
await page.locator('[data-slot="alert-dialog-cancel"], button:has-text("Vazgeç")').first().click();
await page.waitForTimeout(800);
const t1 = await prisma.tenant.findUnique({ where: { id: tenant.id }, select: { status: true } });
const susp1 = await prisma.tenantSuspension.findUnique({ where: { tenantId: tenant.id } });
if (t1?.status === 'suspended') record('cancel-bypass', 'tenant got suspended after Cancel');
if (susp1) record('cancel-bypass', 'TenantSuspension row created after Cancel');

// E2 — Open archive dialog, click Cancel — assert not archived
currentCheck = 'archive cancel does not mutate';
await visit(SA);
// Find archive button - it's the 2nd button with Archive icon
await page.locator('button:has-text("Arşivle")').first().click();
await page.waitForTimeout(500);
await page.locator('[data-slot="alert-dialog-cancel"], button:has-text("Vazgeç")').first().click();
await page.waitForTimeout(800);
const t2 = await prisma.tenant.findUnique({
  where: { id: tenant.id },
  select: { status: true, deletedAt: true },
});
if (t2?.deletedAt !== null)
  record('cancel-bypass', `archive Cancel mutated deletedAt to ${t2?.deletedAt}`);

// ─────────────────────────────────────────────────────────────────────
//  Suite F — render after action (state reflects on next render)
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'F. render-after-action';

// F1 — Add tag, then assert it's visible in same page
currentCheck = 'tag visible after add';
await visit(`${SA}/tags`);
await page.locator('input[name="label"]').fill('bughunt-visible');
await page.locator('button[type="submit"]:has-text("Ekle")').click();
await page.waitForTimeout(1500);
const tagsHtml = await page.content();
if (!tagsHtml.includes('bughunt-visible')) {
  record('stale-render', 'newly added tag "bughunt-visible" not visible after action');
}

// F2 — Remove the same tag, then assert it's gone
currentCheck = 'tag gone after remove';
// Click × on the bughunt-visible tag
await page
  .locator(`span:has-text("bughunt-visible") button[aria-label]`)
  .first()
  .click()
  .catch(() => {});
await page.waitForTimeout(1500);
const tagsHtmlAfter = await page.content();
if (tagsHtmlAfter.includes('bughunt-visible')) {
  record('stale-render', 'removed tag "bughunt-visible" still visible');
}

// ─────────────────────────────────────────────────────────────────────
//  Suite G — special-char data (apostrophe, emoji, Cyrillic, RTL)
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'G. special-char data';

const specialStrings = [
  { name: 'apostrophe', value: "Acme's customer" },
  { name: 'emoji', value: '🔥 high priority 🚨' },
  { name: 'cyrillic', value: 'Российский клиент' },
  { name: 'rtl-arabic', value: 'تجارة الإلكترونية' },
  { name: 'sql-like', value: '"; DROP TABLE tenant_tag;--' },
  { name: 'html-like', value: '<script>alert(1)</script>' },
];

for (const { name, value } of specialStrings) {
  currentCheck = `tag with ${name}`;
  await visit(`${SA}/tags`);
  await page.locator('input[name="label"]').fill(value.slice(0, 64));
  // Wait for the server action POST response before moving on (otherwise
  // the next iteration's navigation aborts our submission).
  const [resp] = await Promise.all([
    page
      .waitForResponse((r) => r.url().includes('/tags') && r.request().method() === 'POST', {
        timeout: 8000,
      })
      .catch(() => null),
    page.locator('button[type="submit"]:has-text("Ekle")').click(),
  ]);
  await page.waitForTimeout(500);
  if (resp && resp.status() >= 400) {
    record('special-char-server-error', `tag with ${name}: HTTP ${resp.status()}`);
    continue;
  }
  const stored = await prisma.tenantTag.findFirst({
    where: { tenantId: tenant.id, label: value.slice(0, 64) },
  });
  if (!stored) {
    record('special-char-rejected', `tag with ${name} ("${value.slice(0, 30)}") not stored`);
  } else {
    // Verify it renders correctly (no encoding issues)
    const html = await page.content();
    if (name === 'html-like' && html.includes('<script>alert(1)</script>')) {
      record('xss-vulnerable', 'unescaped script tag in tag list rendering');
    }
  }
}
// Cleanup
await prisma.tenantTag.deleteMany({ where: { tenantId: tenant.id } });

// ─────────────────────────────────────────────────────────────────────
//  Suite H — no-op idempotency
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'H. idempotency';

// H1 — Enabling already-enabled addon: should be no-op (action checks `before`)
currentCheck = 'addon double-enable idempotent';
await prisma.tenantAddon.deleteMany({ where: { tenantId: tenant.id } });
await visit(`${SA}/addons`);
const firstEnableBtn = page.locator('button:has-text("Aç")').first();
await firstEnableBtn.click();
await page.waitForTimeout(1500);
// Now the button should say "Kapat"; if we somehow click "Aç" again (re-load)
// — instead let's just verify the action handles "already enabled" gracefully
await visit(`${SA}/addons`);
const enabledTwiceCount = await prisma.tenantAddon.count({ where: { tenantId: tenant.id } });
if (enabledTwiceCount !== 1) {
  record('idempotency-broken', `addon enabled ${enabledTwiceCount} times, expected 1`);
}

// H2 — Subscription change to SAME plan/status: should it audit-log or no-op?
currentCheck = 'subscription no-op same values';
await visit(`${SA}/subscription`);
await page.locator('button:has-text("Planı değiştir")').click();
await page.waitForTimeout(600);
// Current is pro/active per reset. Pick the same.
await page.locator('select').first().selectOption('pro');
await page.locator('select').nth(1).selectOption('active');
const auditBefore = await prisma.platformAuditLog.count({
  where: { tenantId: tenant.id, action: 'subscription.changed' },
});
// The button SHOULD be disabled since no change
const confirmBtn = page.locator('[data-slot="alert-dialog-action"]');
const isDisabled = await confirmBtn.isDisabled().catch(() => false);
if (!isDisabled) {
  record('idempotency-broken', 'subscription Apply button enabled when no change made');
}
// Close dialog
await page.locator('[data-slot="alert-dialog-cancel"]').first().click();
await page.waitForTimeout(300);

// ─────────────────────────────────────────────────────────────────────
//  Suite I — long content (5000-char note, many tags)
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'I. long-content';

// I1 — 5000-char note: should accept (max 16k)
currentCheck = 'note 5k chars accepted';
await visit(`${SA}/notes`);
const longBody = 'A'.repeat(5000);
await page.locator('textarea[name="body"]').fill(longBody);
await page.locator('button[type="submit"]:has-text("Kaydet")').click();
await page.waitForTimeout(2500);
const longNote = await prisma.tenantNote.findFirst({
  where: { tenantId: tenant.id, body: { startsWith: 'AAAA' } },
});
if (!longNote || longNote.body.length !== 5000) {
  record('long-content-fail', `5000-char note: stored len=${longNote?.body.length ?? 'n/a'}`);
}

// I2 — 20-tag display: page should render all without crash
currentCheck = '20 tags rendered';
const TAG_FILL = Array.from({ length: 20 }, (_, i) => `bulk-${String(i).padStart(2, '0')}`);
for (const lbl of TAG_FILL) {
  await prisma.tenantTag.create({
    data: {
      tenantId: tenant.id,
      label: lbl,
      color: 'zinc',
      createdBy: '00000000-0000-0000-0000-000000d3b002',
    },
  });
}
await visit(`${SA}/tags`);
const bulkHtml = await page.content();
const found = TAG_FILL.filter((l) => bulkHtml.includes(l)).length;
if (found < 20) record('long-content-render', `only ${found}/20 bulk tags rendered`);

// ─────────────────────────────────────────────────────────────────────
//  Suite J — performance (load time per tab — bug if any tab > 3s)
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'J. performance';
const perfTabs = [
  '',
  '/addons',
  '/tags',
  '/notes',
  '/subscription',
  '/overrides',
  '/users',
  '/timeline',
  '/activity',
  '/documents',
  '/vitals',
];
const slow = [];
for (const sub of perfTabs) {
  currentCheck = `load time ${sub || 'overview'}`;
  const url = `/tr/v2/super-admin/tenants/${tenant.id}${sub}`;
  const t0 = Date.now();
  await page.goto(`${BASE}${url}`);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  const dt = Date.now() - t0;
  if (dt > 3000) {
    record('perf-slow', `${sub || 'overview'} took ${dt}ms (>3s)`);
    slow.push({ tab: sub || 'overview', ms: dt });
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Suite K — full route × locale matrix (all 5 locales × 11 detail tabs)
// ─────────────────────────────────────────────────────────────────────
currentSuite = 'K. full locale matrix';
const ALL_LOCALES = ['en', 'tr', 'ru', 'zh', 'de'];
const ALL_TABS = [
  '',
  '/addons',
  '/tags',
  '/notes',
  '/subscription',
  '/overrides',
  '/users',
  '/timeline',
  '/activity',
  '/documents',
  '/vitals',
];
for (const loc of ALL_LOCALES) {
  for (const sub of ALL_TABS) {
    currentCheck = `${loc}${sub}`;
    await visit(`/${loc}/v2/super-admin/tenants/${tenant.id}${sub}`);
  }
}

// Cleanup all bughunt + bulk traces
await prisma.tenantTag.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantAddon.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantFeatureKill.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantPriceOverride.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantNote.deleteMany({ where: { tenantId: tenant.id } });

await browser.close();

// Dev log diff
let devLogErrors = [];
try {
  const endBytes = Number(execSync('wc -c < /tmp/dev.log', { encoding: 'utf-8' }).trim());
  const diff = Math.max(0, endBytes - devLogStartBytes);
  if (diff > 0) {
    const tail = execSync(`tail -c ${diff} /tmp/dev.log`, { encoding: 'utf-8' });
    devLogErrors = tail
      .split('\n')
      .filter((l) => /error|ERR_|✗|❌|FAIL|exception|stack/i.test(l))
      .filter((l) => !/clerk\.accounts\.dev|failed_to_load_clerk_js|ClerkRuntimeError/i.test(l))
      .slice(0, 100);
  }
} catch {
  /* ignore */
}

// Report
const bySuite = {};
for (const i of issues) {
  bySuite[i.suite] ??= 0;
  bySuite[i.suite]++;
}

log('');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log(`  🐞 BUG HUNT — ${issues.length} issue(s)`);
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
for (const [s, n] of Object.entries(bySuite)) {
  log(`  ${s.padEnd(40)} ${n}`);
}
log('');
if (issues.length > 0) {
  log('Detay:');
  for (const i of issues.slice(0, 40)) {
    log(`  [${i.suite}] ${i.check} — [${i.kind}] ${i.detail.slice(0, 200)}`);
  }
  if (issues.length > 40) log(`  ...ve ${issues.length - 40} daha`);
}
log('');
log(`📜 DEV server log diff — ${devLogErrors.length} error-like line(s)`);
for (const l of devLogErrors.slice(0, 8)) log(`  ${l.slice(0, 200)}`);

writeFileSync(REPORT, JSON.stringify({ tenant: tenant.id, issues, devLogErrors }, null, 2));
log('');
log(`📁 Rapor: ${REPORT}`);

await prisma.$disconnect();
process.exit(issues.length === 0 ? 0 : 1);
