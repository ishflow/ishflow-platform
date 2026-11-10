// Multi-tenant sweep — visit the 12 SA detail tabs against tenants of every
// plan tier + multiple statuses. Catches bugs that only manifest with
// specific configurations (e.g. enterprise plan rendering, deleted tenants,
// trialing edge cases).

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const log = console.info;
const BASE = 'http://localhost:3100';
const REPORT = '/tmp/multi-tenant-sweep-report.json';

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

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

// Pick one tenant per (plan, status) bucket
const sampleSql = `
SELECT DISTINCT ON (plan, status) id, name, slug, plan, status
FROM tenant
WHERE deleted_at IS NULL AND slug LIKE 'demo-sa-%'
ORDER BY plan, status, name
LIMIT 25
`;
const samples = await prisma.$queryRawUnsafe(sampleSql);
log(`Picked ${samples.length} (plan,status) samples:`);
for (const s of samples) {
  log(`  ${s.plan.padEnd(10)} ${s.status.padEnd(10)} ${s.name}`);
}

const issues = [];
let currentTenant = '';
let currentTab = '';
function record(kind, detail) {
  issues.push({
    tenant: currentTenant,
    tab: currentTab,
    kind,
    detail: String(detail).slice(0, 500),
  });
}

let devLogStart = 0;
try {
  devLogStart = Number(execSync('wc -c < /tmp/dev.log', { encoding: 'utf-8' }).trim());
} catch {
  /* ignore */
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on('console', (msg) => {
  const t = msg.type();
  if (t !== 'error' && t !== 'warning' && t !== 'assert') return;
  const text = msg.text();
  if (BENIGN_PATTERNS.some((re) => re.test(text))) return;
  record(`console.${t}`, text);
});
page.on('pageerror', (err) => {
  const m = err.stack ?? err.message;
  if (BENIGN_PATTERNS.some((re) => re.test(m))) return;
  record('pageerror', m);
});
page.on('requestfailed', (req) => {
  const url = req.url();
  if (url.includes('_next/static') || url.includes('hot-update')) return;
  if (BENIGN_URLS.some((re) => re.test(url))) return;
  record('requestfailed', `${req.method()} ${url} — ${req.failure()?.errorText}`);
});
page.on('response', (resp) => {
  const status = resp.status();
  if (status < 400) return;
  const url = resp.url();
  if (url.includes('_next/static')) return;
  if (BENIGN_URLS.some((re) => re.test(url))) return;
  record(`http.${status}`, `${resp.request().method()} ${url}`);
});

const TABS = [
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
  '/debug',
];
const LOCALE = 'tr';

let visitsDone = 0;
const total = samples.length * TABS.length;
log(`\n▶ Visiting ${total} URLs (${samples.length} tenants × ${TABS.length} tabs)`);

for (const s of samples) {
  currentTenant = `${s.plan}/${s.status} ${s.slug}`;
  for (const sub of TABS) {
    currentTab = sub || 'overview';
    const url = `/${LOCALE}/v2/super-admin/tenants/${s.id}${sub}`;
    try {
      await page.goto(`${BASE}${url}`, { timeout: 20000 });
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    } catch (err) {
      record('navigation-error', String(err));
    }
    visitsDone += 1;
    if (visitsDone % 50 === 0) log(`  …${visitsDone}/${total}`);
  }
}

await browser.close();

// Dev log diff
let devLogErrors = [];
try {
  const end = Number(execSync('wc -c < /tmp/dev.log', { encoding: 'utf-8' }).trim());
  const diff = end - devLogStart;
  if (diff > 0) {
    const tail = execSync(`tail -c ${diff} /tmp/dev.log`, { encoding: 'utf-8' });
    devLogErrors = tail
      .split('\n')
      .filter((l) => /error|ERR_|exception/i.test(l))
      .filter((l) => !/clerk\.accounts\.dev|ClerkRuntimeError|failed_to_load_clerk_js/i.test(l))
      .slice(0, 50);
  }
} catch {
  /* ignore */
}

const byKind = {};
for (const i of issues) byKind[i.kind] = (byKind[i.kind] ?? 0) + 1;

log('');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log(`  🐞 MULTI-TENANT SWEEP — ${visitsDone} visits, ${issues.length} issue(s)`);
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
for (const [k, n] of Object.entries(byKind)) log(`  ${k.padEnd(28)} ${n}`);

if (issues.length > 0) {
  log('');
  log('İlk 25 detay:');
  for (const i of issues.slice(0, 25)) {
    log(`  [${i.tenant}] ${i.tab} — [${i.kind}] ${i.detail.slice(0, 140)}`);
  }
}

log('');
log(`📜 dev.log error-like: ${devLogErrors.length}`);
for (const l of devLogErrors.slice(0, 5)) log(`  ${l.slice(0, 200)}`);

writeFileSync(REPORT, JSON.stringify({ visitsDone, issues, devLogErrors }, null, 2));
log(`\n📁 Rapor: ${REPORT}`);

await prisma.$disconnect();
process.exit(issues.length === 0 ? 0 : 1);
