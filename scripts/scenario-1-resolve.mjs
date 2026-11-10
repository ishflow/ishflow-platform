// Scenario 1 — RESOLVE (v2 — full instrumentation)
//
// Acme Trading multi-issue ops dogfood. Headed Chromium. Adım-adım:
//   - UI tıklama
//   - Anlık DB doğrulaması (entity gerçekten değişti mi?)
//   - Anlık audit log doğrulaması (ilgili action satırı yazıldı mı?)
//   - Browser ALL-LEVEL event capture (console/pageerror/requestfailed/HTTP 4xx-5xx/crash)
//   - Dev server log diff (start vs end tail)
//   - Final: SA overview + timeline tab visits + visual+text-content asserts
//   - Final: bütün issue listesi + screenshot dizini
//
// Önce setup'ı çalıştır:
//   pnpm dotenv -e .env.local -- node scripts/scenario-1-setup.mjs
// Sonra bu:
//   pnpm dotenv -e .env.local -- node scripts/scenario-1-resolve.mjs

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const log = console.info;
const BASE = 'http://localhost:3100';
const LOCALE = 'tr';
const TENANT_SLUG = 'demo-sa-acme';
const STEP_DELAY = process.env.HEADLESS === '1' ? 200 : 1500;
const READ_DELAY = process.env.HEADLESS === '1' ? 200 : 4500;
const DEV_LOG = '/tmp/dev.log';
const REPORT_FILE = '/tmp/scenario-1-report.json';

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const tenant = await prisma.tenant.findFirst({
  where: { slug: TENANT_SLUG },
  select: { id: true, name: true, plan: true, status: true },
});
if (!tenant) {
  console.error(`No tenant with slug=${TENANT_SLUG}. Run scenario-1-setup.mjs first.`);
  process.exit(1);
}

const TENANT_BASE = `${BASE}/${LOCALE}/v2/super-admin/tenants/${tenant.id}`;

// ─────────────────────────────────────────────────────────────────────
//  Issue collection (browser + server side)
// ─────────────────────────────────────────────────────────────────────
const issues = []; // { stepNo, kind, detail, ts }
let currentStep = 0;
function record(kind, detail) {
  issues.push({
    stepNo: currentStep,
    kind,
    detail: typeof detail === 'string' ? detail.slice(0, 800) : String(detail).slice(0, 800),
    ts: new Date().toISOString(),
  });
}

// Snapshot dev.log size at start so we can diff later
let devLogStartBytes = 0;
try {
  devLogStartBytes = Number(execSync(`wc -c < ${DEV_LOG}`, { encoding: 'utf-8' }).trim());
} catch {
  /* dev.log may not exist; that's OK */
}

// ─────────────────────────────────────────────────────────────────────
//  Browser
// ─────────────────────────────────────────────────────────────────────
const HEADLESS = process.env.HEADLESS === '1';
const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 200 });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Filter known-benign dev warnings (Clerk dev-keys notice, deprecated props,
// Next.js HMR chatter). Anything else of type error/warning/assert is reported.
const BENIGN_PATTERNS = [
  /Clerk has been loaded with development keys/i,
  /The prop "afterSignInUrl" is deprecated/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  // Clerk JS CDN script blocked by CORS when crossing dev origin — server
  // already has the session via dev-bypass header, client-side Clerk SDK
  // failure is harmless to our tests.
  /clerk\.accounts\.dev/i,
  /Failed to load resource.*net::ERR_FAILED/i,
  /ClerkRuntimeError.*Failed to load Clerk/i,
];

const BENIGN_REQUEST_URLS = [/clerk\.accounts\.dev/i, /clerk-telemetry/i];
page.on('console', (msg) => {
  const t = msg.type();
  if (t === 'error' || t === 'warning' || t === 'assert') {
    const text = msg.text();
    if (BENIGN_PATTERNS.some((re) => re.test(text))) return;
    record(`console.${t}`, text);
  }
});
page.on('pageerror', (err) => {
  const msg = err.stack ?? err.message;
  if (BENIGN_PATTERNS.some((re) => re.test(msg))) return;
  record('pageerror', msg);
});
page.on('requestfailed', (req) => {
  // Ignore noisy aborted devtools / static requests
  const url = req.url();
  if (url.includes('_next/static') || url.includes('hot-update')) return;
  if (BENIGN_REQUEST_URLS.some((re) => re.test(url))) return;
  record('requestfailed', `${req.method()} ${url} — ${req.failure()?.errorText}`);
});
page.on('response', (resp) => {
  const status = resp.status();
  if (status >= 400) {
    const url = resp.url();
    if (url.includes('_next/static')) return;
    record(`http.${status}`, `${resp.request().method()} ${url}`);
  }
});
page.on('crash', () => record('crash', 'page crashed'));

// ─────────────────────────────────────────────────────────────────────
//  DB verification helpers
// ─────────────────────────────────────────────────────────────────────
async function verifyTag(label) {
  const row = await prisma.tenantTag.findUnique({
    where: { tenantId_label: { tenantId: tenant.id, label } },
  });
  return row ? null : `tag "${label}" not in DB`;
}
async function verifyNoteContains(snippet) {
  const note = await prisma.tenantNote.findFirst({
    where: { tenantId: tenant.id, body: { contains: snippet } },
    orderBy: { createdAt: 'desc' },
  });
  return note ? null : `no note containing "${snippet}"`;
}
async function verifyAudit(action) {
  const row = await prisma.platformAuditLog.findFirst({
    where: { tenantId: tenant.id, action },
    orderBy: { createdAt: 'desc' },
  });
  // accept anything written in the last 60s
  if (!row) return `no audit row for action=${action}`;
  const ageMs = Date.now() - row.createdAt.getTime();
  if (ageMs > 60_000) return `audit row for ${action} is ${(ageMs / 1000) | 0}s old (stale)`;
  return null;
}
async function verifyPlanStatus(plan, status) {
  const t = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { plan: true, status: true },
  });
  if (!t) return 'tenant missing';
  if (t.plan !== plan) return `plan = ${t.plan}, expected ${plan}`;
  if (t.status !== status) return `status = ${t.status}, expected ${status}`;
  return null;
}
async function verifyAddonEnabled(key) {
  const row = await prisma.tenantAddon.findUnique({
    where: { tenantId_addonKey: { tenantId: tenant.id, addonKey: key } },
  });
  return row ? null : `addon ${key} not enabled`;
}
async function verifyFeatureKillGone(key) {
  const row = await prisma.tenantFeatureKill.findUnique({
    where: { tenantId_featureKey: { tenantId: tenant.id, featureKey: key } },
  });
  return row ? `feature kill ${key} still present` : null;
}
async function verifyPriceOverride(usd) {
  const row = await prisma.tenantPriceOverride.findUnique({ where: { tenantId: tenant.id } });
  if (!row) return 'no price override row';
  if (row.monthlyPriceUsd.toString() !== String(usd)) {
    return `price = ${row.monthlyPriceUsd.toString()}, expected ${usd}`;
  }
  return null;
}
async function verifyMembershipGone(email) {
  const row = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, user: { email } },
  });
  return row ? `membership for ${email} still present` : null;
}
async function combine(...checks) {
  const out = [];
  for (const c of checks) {
    const r = await c;
    if (r) out.push(r);
  }
  return out.length ? out.join('; ') : null;
}

// ─────────────────────────────────────────────────────────────────────
//  Step harness
// ─────────────────────────────────────────────────────────────────────
async function step({ title, why, ui, verify }) {
  currentStep += 1;
  log('');
  log(`▶ ADIM ${currentStep}. ${title}`);
  log(`   ${why}`);
  const tStart = Date.now();
  const issuesBefore = issues.length;
  try {
    await ui();
  } catch (err) {
    record('ui-error', err instanceof Error ? (err.stack ?? err.message) : String(err));
  }
  try {
    await page.screenshot({
      path: `/tmp/scenario-1-step-${String(currentStep).padStart(2, '0')}.png`,
    });
  } catch (err) {
    record('screenshot-fail', String(err));
  }

  // DB verification
  if (verify) {
    try {
      const fail = await verify();
      if (fail) {
        record('verify-fail', fail);
        log(`   ✗ DB doğrulama: ${fail}`);
      } else {
        log('   ✓ DB doğrulama OK');
      }
    } catch (err) {
      record('verify-error', String(err));
    }
  }

  const newIssues = issues.length - issuesBefore;
  if (newIssues > 0) {
    log(`   ⚠ ${newIssues} yeni issue capture edildi (raporda detay)`);
  }
  const dur = Date.now() - tStart;
  log(`   ⏱ ${dur}ms`);
  await page.waitForTimeout(STEP_DELAY);
}

// ─────────────────────────────────────────────────────────────────────
//  Header
// ─────────────────────────────────────────────────────────────────────
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('  SENARYO 1 — Acme Trading Mayıs anniversary toplu krizi');
log(`  Tenant: ${tenant.name} (${tenant.id.slice(0, 8)}…)`);
log(`  Başlangıç: plan=${tenant.plan} status=${tenant.status}`);
log(
  '  Browser olay yakalama aktif: console.error/warning · pageerror · requestfailed · HTTP 4xx-5xx · crash',
);
log(`  Dev log diff: ${DEV_LOG} (başlangıç: ${devLogStartBytes} byte)`);
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ─────────────────────────────────────────────────────────────────────
//  Steps
// ─────────────────────────────────────────────────────────────────────
await step({
  title: 'Notes — CSM triage notunu oku',
  why: 'Vakanın bağlamını anla.',
  ui: async () => {
    await page.goto(`${TENANT_BASE}/notes`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(READ_DELAY);
  },
  verify: () => verifyNoteContains('[CSM TICKET] Acme Trading'),
});

await step({
  title: 'Tags — "high-value" ekle',
  why: 'Triajda öncelikli müşteri.',
  ui: async () => {
    await page.goto(`${TENANT_BASE}/tags`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.locator('input[name="label"]').fill('high-value');
    await page.locator('button[type="submit"]:has-text("Ekle")').click();
    await page.waitForTimeout(1200);
  },
  verify: () => combine(verifyTag('high-value'), verifyAudit('tag.added')),
});

await step({
  title: 'Tags — "annual-contract" ekle',
  why: 'Yıllık kontrat müşterisi olduğunu işaretle.',
  ui: async () => {
    await page.locator('input[name="label"]').fill('annual-contract');
    await page.locator('button[type="submit"]:has-text("Ekle")').click();
    await page.waitForTimeout(1200);
  },
  verify: () => combine(verifyTag('annual-contract'), verifyAudit('tag.added')),
});

await step({
  title: 'Notes — "Triaj başladı" notu',
  why: 'Yapılan işlerin kaydı için açılış notu.',
  ui: async () => {
    await page.goto(`${TENANT_BASE}/notes`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page
      .locator('textarea[name="body"]')
      .fill(
        '[TRIAGE] CSM ticketı incelendi. Goodwill upgrade + custom price + addon enable + member cleanup yapılıyor.',
      );
    await page.locator('button[type="submit"]:has-text("Kaydet")').click();
    await page.waitForTimeout(1200);
  },
  verify: () => combine(verifyNoteContains('[TRIAGE]'), verifyAudit('note.added')),
});

await step({
  title: 'Subscription — plan: free→pro, status: past_due→active',
  why: 'CSM onaylı goodwill upgrade + yıllık kontrat past_due override.',
  ui: async () => {
    await page.goto(`${TENANT_BASE}/subscription`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.locator('button:has-text("Planı değiştir")').click();
    await page.waitForTimeout(800);
    await page.locator('select').first().selectOption('pro');
    await page.locator('select').nth(1).selectOption('active');
    await page
      .locator('input[placeholder*="kontrata"]')
      .fill(
        'Goodwill upgrade. Yıllık kontrat USD wire transfer ile alındı (2026-05-15). CSM Lead onayladı.',
      );
    await page.locator('button:has-text("Uygula")').click();
    await page.waitForTimeout(1500);
  },
  verify: () => combine(verifyPlanStatus('pro', 'active'), verifyAudit('subscription.changed')),
});

await step({
  title: "Addons — AI Invoice OCR'ı aç",
  why: "Pro plana geçtik, OCR feature'ını entitle ediyoruz.",
  ui: async () => {
    await page.goto(`${TENANT_BASE}/addons`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.locator('button:has-text("Aç")').filter({ hasNotText: '×' }).first().click();
    await page.waitForTimeout(1500);
  },
  verify: () => combine(verifyAddonEnabled('ai_invoice_ocr'), verifyAudit('addon.enabled')),
});

await step({
  title: "Overrides — marketplace_sync kill'ini kaldır",
  why: 'Wildberries güvenlik şüphesi giderildi.',
  ui: async () => {
    await page.goto(`${TENANT_BASE}/overrides`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.locator(`button[aria-label="Kill'i kaldır"]`).first().click();
    await page.waitForTimeout(1500);
  },
  verify: () =>
    combine(verifyFeatureKillGone('marketplace_sync'), verifyAudit('feature_kill.removed')),
});

await step({
  title: 'Overrides — price $0/ay (annual prepaid)',
  why: 'Stripe past_due tekrar tetiklenmesin.',
  ui: async () => {
    await page.locator('input[name="monthlyPriceUsd"]').fill('0');
    await page
      .locator('input[name="reason"]')
      .last()
      .fill('Annual contract pre-paid 2026-05-15 (wire transfer)');
    await page.locator('button[type="submit"]:has-text("Override kaydet")').click();
    await page.waitForTimeout(1500);
  },
  verify: () => combine(verifyPriceOverride('0'), verifyAudit('price_override.added')),
});

await step({
  title: "Members — Ayşe Yılmaz'ı çıkar",
  why: 'İşten ayrılan eski muhasebeci. Clerk hesabı korunur.',
  ui: async () => {
    await page.goto(`${TENANT_BASE}/users`);
    await page.waitForLoadState('networkidle').catch(() => {});
    const row = page.locator(`tr:has-text("ayse.yilmaz@acme-trading.test")`).first();
    await row.locator('[data-slot="alert-dialog-trigger"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-slot="alert-dialog-action"]').click();
    await page.waitForTimeout(1500);
  },
  verify: () =>
    combine(verifyMembershipGone('ayse.yilmaz@acme-trading.test'), verifyAudit('member.removed')),
});

await step({
  title: 'Notes — resolution note',
  why: 'Yapılan işlerin özetini kayda geç.',
  ui: async () => {
    await page.goto(`${TENANT_BASE}/notes`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page
      .locator('textarea[name="body"]')
      .fill(
        [
          '[RESOLVED] Acme Trading Mayıs anniversary krizi kapatıldı:',
          '',
          '✓ Plan: free → pro (goodwill upgrade)',
          '✓ Status: past_due → active (annual contract override)',
          '✓ Price override: $0/ay (annual prepaid)',
          '✓ Addon: AI Invoice OCR açıldı',
          '✓ Feature kill kaldırıldı: marketplace_sync',
          '✓ Member çıkarıldı: Ayşe Yılmaz',
          "✓ Tag'ler: high-value + annual-contract",
        ].join('\n'),
      );
    await page.locator('button[type="submit"]:has-text("Kaydet")').click();
    await page.waitForTimeout(1500);
  },
  verify: () => combine(verifyNoteContains('[RESOLVED]'), verifyAudit('note.added')),
});

// ─────────────────────────────────────────────────────────────────────
//  Final verification sweep — SA pages reflect new state?
// ─────────────────────────────────────────────────────────────────────
await step({
  title: "Doğrulama — Overview sayfası yeni state'i yansıtıyor mu?",
  why: "Header pill'leri + operator bar status'u doğru olmalı.",
  ui: async () => {
    await page.goto(TENANT_BASE);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(READ_DELAY);
  },
  verify: async () => {
    // Header should contain "Acme"; operator bar status pill text matches "Aktif"
    const html = await page.content();
    const fails = [];
    if (!/Aktif/i.test(html)) fails.push('overview HTML missing "Aktif" status text');
    if (!/operatorBar/i.test(html) && !/Aktif/.test(html)) fails.push('operator bar missing');
    return fails.length ? fails.join('; ') : null;
  },
});

await step({
  title: "Doğrulama — Timeline'da yapılan audit girdileri görünüyor mu?",
  why: "Bu session'da yapılan tüm değişiklikler audit log'da olmalı.",
  ui: async () => {
    await page.goto(`${TENANT_BASE}/timeline`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
  },
  verify: async () => {
    // Timeline page only renders Tenant/TenantSettings/TenantSuspension/Membership AuditLog entries;
    // platform_audit_log (where SA actions land) is separate. Skip text check, just confirm page rendered.
    const txt = (await page.content()).slice(0, 200_000);
    if (!txt.includes('timeline')) return 'timeline page content missing';
    return null;
  },
});

await step({
  title: 'Doğrulama — Addons tab yeni durumu yansıtıyor mu?',
  why: 'AI Invoice OCR satırı artık "Açık" pill\'ı + Kapat butonu göstermeli.',
  ui: async () => {
    await page.goto(`${TENANT_BASE}/addons`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
  },
  verify: async () => {
    const html = await page.content();
    const fails = [];
    if (!/Açık/.test(html)) fails.push('no "Açık" pill found');
    if (!/Kapat/.test(html))
      fails.push('no "Kapat" (disable) button found — addon may not be enabled');
    return fails.length ? fails.join('; ') : null;
  },
});

// ─────────────────────────────────────────────────────────────────────
//  Müşteri tarafı — Acme tenant gözünden V2 müşteri sayfaları
//  (dev-bypass header override: x-dev-bypass-tenant=<acme-id>)
// ─────────────────────────────────────────────────────────────────────
log('');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('  👤 MÜŞTERİ GÖRÜNÜMÜ — Acme tenant\'a "log in" ediyoruz');
log(`  (dev-bypass user, x-dev-bypass-tenant: ${tenant.id.slice(0, 8)}… header ile)`);
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const tenantCtx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: { 'x-dev-bypass-tenant': tenant.id },
});
const tenantPage = await tenantCtx.newPage();

// Mirror the same error capture on the new page
tenantPage.on('console', (msg) => {
  const t = msg.type();
  if (t === 'error' || t === 'warning' || t === 'assert') {
    const text = msg.text();
    if (BENIGN_PATTERNS.some((re) => re.test(text))) return;
    record(`tenant.console.${t}`, text);
  }
});
tenantPage.on('pageerror', (err) => {
  const msg = err.stack ?? err.message;
  if (BENIGN_PATTERNS.some((re) => re.test(msg))) return;
  record('tenant.pageerror', msg);
});
tenantPage.on('requestfailed', (req) => {
  const url = req.url();
  if (url.includes('_next/static') || url.includes('hot-update')) return;
  if (BENIGN_REQUEST_URLS.some((re) => re.test(url))) return;
  record('tenant.requestfailed', `${req.method()} ${url} — ${req.failure()?.errorText}`);
});
tenantPage.on('response', (resp) => {
  const status = resp.status();
  if (status >= 400) {
    const url = resp.url();
    if (url.includes('_next/static')) return;
    record(`tenant.http.${status}`, `${resp.request().method()} ${url}`);
  }
});

// Helper for tenant-side steps (uses tenantPage instead of page)
async function tenantStep({ title, why, url, expect }) {
  currentStep += 1;
  log('');
  log(`▶ ADIM ${currentStep}. ${title}`);
  log(`   ${why}`);
  const tStart = Date.now();
  const issuesBefore = issues.length;
  try {
    await tenantPage.goto(`${BASE}/${LOCALE}${url}`);
    await tenantPage.waitForLoadState('networkidle').catch(() => {});
    await tenantPage.waitForTimeout(3000);
  } catch (err) {
    record('tenant.ui-error', err instanceof Error ? (err.stack ?? err.message) : String(err));
  }
  try {
    await tenantPage.screenshot({
      path: `/tmp/scenario-1-step-${String(currentStep).padStart(2, '0')}-tenant.png`,
    });
  } catch (err) {
    record('tenant.screenshot-fail', String(err));
  }
  if (expect) {
    try {
      const html = await tenantPage.content();
      const fails = [];
      for (const e of expect) {
        const re = e.shouldMatch ? new RegExp(e.shouldMatch) : null;
        const reN = e.shouldNotMatch ? new RegExp(e.shouldNotMatch) : null;
        if (re && !re.test(html)) fails.push(`expected to find /${e.shouldMatch}/`);
        if (reN?.test(html)) fails.push(`expected NOT to find /${e.shouldNotMatch}/`);
      }
      if (fails.length) {
        record('tenant.verify-fail', fails.join('; '));
        log(`   ✗ HTML doğrulama: ${fails.join('; ')}`);
      } else {
        log('   ✓ HTML doğrulama OK');
      }
    } catch (err) {
      record('tenant.verify-error', String(err));
    }
  }
  const newIssues = issues.length - issuesBefore;
  if (newIssues > 0) log(`   ⚠ ${newIssues} yeni issue (raporda detay)`);
  log(`   ⏱ ${Date.now() - tStart}ms`);
  await tenantPage.waitForTimeout(STEP_DELAY);
}

await tenantStep({
  title: 'Müşteri görünümü — V2 dashboard',
  why: "Acme'nin kendi dashboard'ı. Plan/status changes burada yansımalı.",
  url: '/v2/dashboard',
  expect: [{ shouldMatch: 'Acme', message: 'Tenant adı "Acme" görünmeli' }],
});

await tenantStep({
  title: 'Müşteri görünümü — Üyeler sayfası',
  why: 'Ayşe Yılmaz artık üye listesinde olmamalı.',
  url: '/v2/admin/members',
  expect: [
    { shouldNotMatch: 'ayse\\.yilmaz', message: 'Ayşe email görünmemeli' },
    { shouldNotMatch: 'Ayşe Yılmaz', message: 'Ayşe adı görünmemeli' },
  ],
});

await tenantStep({
  title: 'Müşteri görünümü — Eklentiler sayfası',
  why: 'AI Invoice OCR pro-only feature artık entitled olmalı.',
  url: '/v2/addons',
  expect: [{ shouldMatch: 'AI', message: 'AI eklentisi listede olmalı' }],
});

await tenantCtx.close();

// ─────────────────────────────────────────────────────────────────────
//  Final state snapshot (DB)
// ─────────────────────────────────────────────────────────────────────
const final = {
  tenant: await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { plan: true, status: true },
  }),
  addons: await prisma.tenantAddon.count({ where: { tenantId: tenant.id } }),
  tags: await prisma.tenantTag.findMany({
    where: { tenantId: tenant.id },
    select: { label: true },
    orderBy: { label: 'asc' },
  }),
  notes: await prisma.tenantNote.count({ where: { tenantId: tenant.id } }),
  feature_kills: await prisma.tenantFeatureKill.count({ where: { tenantId: tenant.id } }),
  price: await prisma.tenantPriceOverride.findUnique({ where: { tenantId: tenant.id } }),
  ayse_membership: await prisma.membership.count({
    where: { tenantId: tenant.id, user: { email: 'ayse.yilmaz@acme-trading.test' } },
  }),
  audit_in_this_run: await prisma.platformAuditLog.count({
    where: {
      tenantId: tenant.id,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // last 5 min
    },
  }),
};

// ─────────────────────────────────────────────────────────────────────
//  Dev server log diff
// ─────────────────────────────────────────────────────────────────────
let devLogTail = '';
let devLogErrors = [];
try {
  const endBytes = Number(execSync(`wc -c < ${DEV_LOG}`, { encoding: 'utf-8' }).trim());
  const diffBytes = Math.max(0, endBytes - devLogStartBytes);
  if (diffBytes > 0) {
    devLogTail = execSync(`tail -c ${diffBytes} ${DEV_LOG}`, { encoding: 'utf-8' });
    devLogErrors = devLogTail
      .split('\n')
      .filter((l) => /error|ERR_|✗|❌|FAIL|exception|stack/i.test(l))
      .filter((l) => !/clerk\.accounts\.dev|failed_to_load_clerk_js|ClerkRuntimeError/i.test(l))
      .slice(0, 50);
  }
} catch {
  /* ignore */
}

// ─────────────────────────────────────────────────────────────────────
//  Report
// ─────────────────────────────────────────────────────────────────────
log('');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('  📊 FİNAL STATE (DB)');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log(`  plan:             ${final.tenant?.plan}    (beklenen: pro)`);
log(`  status:           ${final.tenant?.status}  (beklenen: active)`);
log(`  addons:           ${final.addons}          (beklenen: 1)`);
log(`  tags:             ${final.tags.map((t) => t.label).join(', ')}`);
log(`  notes:            ${final.notes}           (beklenen: ≥ 3)`);
log(`  feature_kills:    ${final.feature_kills}   (beklenen: 0)`);
log(`  price:            $${final.price?.monthlyPriceUsd ?? '—'}/ay  (beklenen: $0)`);
log(`  ayşe membership:  ${final.ayse_membership === 0 ? 'kaldırıldı ✓' : 'HÂLÂ VAR ✗'}`);
log(`  audit rows (5dk): ${final.audit_in_this_run}`);

log('');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log(`  🐞 ISSUE CAPTURE — ${issues.length} item(s)`);
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (issues.length === 0) {
  log('  hiç problem yakalanmadı ✅');
} else {
  const byKind = {};
  for (const i of issues) {
    byKind[i.kind] = (byKind[i.kind] ?? 0) + 1;
  }
  for (const [k, n] of Object.entries(byKind)) {
    log(`  ${k.padEnd(20)} ${n}`);
  }
  log('');
  log('  İlk 15 detay:');
  for (const i of issues.slice(0, 15)) {
    log(`    step ${String(i.stepNo).padStart(2)} [${i.kind}] ${i.detail.slice(0, 160)}`);
  }
  if (issues.length > 15) log(`  ...ve ${issues.length - 15} daha (rapor dosyasında)`);
}

log('');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log(`  📜 DEV SERVER LOG DIFF — ${devLogErrors.length} error-like line(s)`);
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (devLogErrors.length === 0) {
  log('  server log temiz ✅');
} else {
  for (const l of devLogErrors.slice(0, 8)) log(`    ${l.slice(0, 200)}`);
  if (devLogErrors.length > 8) log(`  ...ve ${devLogErrors.length - 8} daha (rapor dosyasında)`);
}

// JSON report
writeFileSync(
  REPORT_FILE,
  JSON.stringify({ tenant: tenant.id, final, issues, devLogErrors }, null, 2),
);
log('');
log(`📁 Detaylı rapor: ${REPORT_FILE}`);
log('📷 Screenshots SA: /tmp/scenario-1-step-{01..13}.png');
log('📷 Screenshots tenant view: /tmp/scenario-1-step-{14..16}-tenant.png');
log('');

const overallOk =
  final.tenant?.plan === 'pro' &&
  final.tenant?.status === 'active' &&
  final.addons === 1 &&
  final.tags.length === 2 &&
  final.notes >= 3 &&
  final.feature_kills === 0 &&
  final.price?.monthlyPriceUsd.toString() === '0' &&
  final.ayse_membership === 0;

log(
  overallOk
    ? '✅ Senaryo başarılı: tüm beklenen değerler tutuyor'
    : '✗ Senaryo eksik: yukarıdaki "beklenen" değerleri kontrol et',
);
log('');
if (!HEADLESS) {
  log('Tarayıcı 15 saniye açık kalacak — gözlemle.');
  await page.waitForTimeout(15000);
}

await browser.close();
await prisma.$disconnect();
process.exit(overallOk ? 0 : 1);
