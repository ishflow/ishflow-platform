// Scenario 2 — RESOLVE (suspend/lift cycle)
//
// Headless by default; pass HEADLESS=0 to watch.

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const log = console.info;
const BASE = 'http://localhost:3100';
const LOCALE = 'tr';
const SLUG = 'demo-sa-tech-hub';
const HEADLESS = process.env.HEADLESS !== '0';
const STEP_DELAY = HEADLESS ? 300 : 1500;

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const tenant = await prisma.tenant.findFirst({
  where: { slug: SLUG },
  select: { id: true, name: true },
});
if (!tenant) {
  console.error(`No tenant ${SLUG}.`);
  process.exit(1);
}
const SA = `${BASE}/${LOCALE}/v2/super-admin/tenants/${tenant.id}`;

const issues = [];
let stepNo = 0;
function record(kind, detail) {
  issues.push({ stepNo, kind, detail: String(detail).slice(0, 500) });
}

const BENIGN = [
  /Clerk has been loaded with development keys/i,
  /afterSignInUrl" is deprecated/i,
  /\[Fast Refresh\]/i,
  /clerk\.accounts\.dev/i,
  /Failed to load resource.*net::ERR_FAILED/i,
  /ClerkRuntimeError.*Failed to load Clerk/i,
  /\[dev-bypass\] ⚠ Clerk auth disabled/i,
];

let devLogStart = 0;
try {
  devLogStart = Number(execSync('wc -c < /tmp/dev.log', { encoding: 'utf-8' }).trim());
} catch {
  /* ignore */
}

const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 200 });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on('console', (m) => {
  const text = m.text();
  if (m.type() !== 'error' && m.type() !== 'warning') return;
  if (BENIGN.some((re) => re.test(text))) return;
  record(`console.${m.type()}`, text);
});
page.on('pageerror', (err) => {
  const s = err.stack ?? err.message;
  if (BENIGN.some((re) => re.test(s))) return;
  record('pageerror', s);
});

async function step(title, why, fn) {
  stepNo += 1;
  log('');
  log(`▶ ADIM ${stepNo}. ${title}`);
  log(`   ${why}`);
  const t0 = Date.now();
  await fn();
  await page
    .screenshot({ path: `/tmp/scenario-2-step-${String(stepNo).padStart(2, '0')}.png` })
    .catch(() => {});
  await page.waitForTimeout(STEP_DELAY);
  log(`   ⏱ ${Date.now() - t0}ms`);
}

log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log(`  SENARYO 2 — Tech Hub güvenlik incident response`);
log(`  Tenant: ${tenant.name} (${tenant.id.slice(0, 8)}…)`);
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Read incident note
await step("Notes — incident report'unu oku", 'Sentry uyarısının detaylarını gör.', async () => {
  await page.goto(`${SA}/notes`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(HEADLESS ? 300 : 4000);
});

// 2. Add security-review tag
await step('Tags — "security-review" ekle', 'Sonra filtrelemek için.', async () => {
  await page.goto(`${SA}/tags`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('input[name="label"]').fill('security-review');
  await page.locator('button[type="submit"]:has-text("Ekle")').click();
  await page.waitForTimeout(1200);
});

// 3. Suspend
await step('Overview — askıya al', 'Credential stuffing şüphesi → erişim kapansın.', async () => {
  await page.goto(SA);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('button:has-text("Askıya al")').first().click();
  await page.waitForTimeout(500);
  await page
    .locator('input[placeholder*="ödeme"]')
    .fill('Credential stuffing şüphesi — Sentry abuse-detector tetiklendi 2026-05-23T14:22Z');
  await page.locator('[data-slot="alert-dialog-action"]').click();
  await page.waitForTimeout(1500);
});

// 4. Verify suspended state
await step(
  'Overview — askıda durumu doğrula',
  'Status pill = Askıda, Lift butonu görünür.',
  async () => {
    await page.goto(SA);
    await page.waitForLoadState('networkidle').catch(() => {});
    const html = await page.content();
    if (!html.includes('Askıyı kaldır')) {
      record('verify-fail', 'Lift button (Askıyı kaldır) not visible after suspend');
    }
    if (!html.toLowerCase().includes('askıda')) {
      record('verify-fail', 'status pill does not say Askıda');
    }
    await page.waitForTimeout(1500);
  },
);

// 5. Triage note
await step('Notes — triage notu ekle', 'Olayın resmî kaydı.', async () => {
  await page.goto(`${SA}/notes`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page
    .locator('textarea[name="body"]')
    .fill(
      '[TRIAGE] Tech Hub askıya alındı. Müşteriden geri dönüş bekleniyor. Hesap incelemesi ESC yetkilisi @ali tarafından yapılacak.',
    );
  await page.locator('button[type="submit"]:has-text("Kaydet")').click();
  await page.waitForTimeout(1500);
});

// 6. Lift (after 'investigation cleared')
await step(
  'Overview — askıyı kaldır',
  'Müşteri kimliği doğrulandı, hesap güvenli — açılıyor.',
  async () => {
    await page.goto(SA);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.locator('button:has-text("Askıyı kaldır")').first().click();
    await page.waitForTimeout(500);
    await page.locator('[data-slot="alert-dialog-action"]').click();
    await page.waitForTimeout(1500);
  },
);

// 7. Resolution note
await step('Notes — resolution note', 'İncelemenin özeti.', async () => {
  await page.goto(`${SA}/notes`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page
    .locator('textarea[name="body"]')
    .fill(
      [
        '[RESOLVED] Tech Hub security incident kapatıldı:',
        '',
        "- Müşteri owner credential'ını rotate etti (yeni şifre + 2FA)",
        "- 4 ülkeden gelen IP'ler block-list'e eklendi",
        '- Askı kaldırıldı, hesap aktif',
        '- "security-review" tag\'i takip için bırakıldı (3 ay)',
      ].join('\n'),
    );
  await page.locator('button[type="submit"]:has-text("Kaydet")').click();
  await page.waitForTimeout(1500);
});

// 8. Final verify
await step(
  'Overview — sonuç doğrulama',
  'Tüm state geri kazanıldı, audit zinciri tamam.',
  async () => {
    await page.goto(SA);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(HEADLESS ? 500 : 3000);
  },
);

// DB verifications
const final = {
  tenant: await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { status: true },
  }),
  tags: await prisma.tenantTag.count({ where: { tenantId: tenant.id, label: 'security-review' } }),
  notes: await prisma.tenantNote.count({ where: { tenantId: tenant.id } }),
  suspension: await prisma.tenantSuspension.findUnique({ where: { tenantId: tenant.id } }),
  auditSuspend: await prisma.platformAuditLog.findFirst({
    where: { tenantId: tenant.id, action: 'tenant.suspended' },
    orderBy: { createdAt: 'desc' },
  }),
  auditLift: await prisma.platformAuditLog.findFirst({
    where: { tenantId: tenant.id, action: 'tenant.suspension_lifted' },
    orderBy: { createdAt: 'desc' },
  }),
};

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
      .filter((l) => !/clerk\.accounts\.dev|ClerkRuntimeError|failed_to_load_clerk_js/i.test(l));
  }
} catch {
  /* ignore */
}

await browser.close();
await prisma.$disconnect();

log('');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('  📊 FİNAL STATE');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log(`  status:               ${final.tenant?.status}   (beklenen: active)`);
log(`  security-review tag:  ${final.tags ? 'OK' : 'MISSING'}`);
log(`  notes (incident+triage+resolution): ${final.notes}   (beklenen: ≥ 3)`);
log(`  suspension row liftedAt: ${final.suspension?.liftedAt ? 'SET' : 'NOT SET'}`);
log(`  audit suspend: ${final.auditSuspend ? final.auditSuspend.id : 'MISSING'}`);
log(`  audit lift:    ${final.auditLift ? final.auditLift.id : 'MISSING'}`);
log('');
log(`🐞 issues: ${issues.length}`);
for (const i of issues.slice(0, 10)) {
  log(`  step ${i.stepNo} [${i.kind}] ${i.detail.slice(0, 160)}`);
}
log(`📜 dev.log error-like lines: ${devLogErrors.length}`);
for (const l of devLogErrors.slice(0, 5)) log(`  ${l.slice(0, 200)}`);

writeFileSync(
  '/tmp/scenario-2-report.json',
  JSON.stringify({ final, issues, devLogErrors }, null, 2),
);
log(`\n📁 Rapor: /tmp/scenario-2-report.json`);
log(`📷 Screenshots: /tmp/scenario-2-step-{01..08}.png`);

const ok =
  final.tenant?.status === 'active' &&
  final.tags === 1 &&
  final.notes >= 3 &&
  final.suspension?.liftedAt &&
  final.auditSuspend &&
  final.auditLift &&
  issues.length === 0;

log('');
log(ok ? '✅ Senaryo 2 başarılı' : '✗ Senaryo 2 eksik');
process.exit(ok ? 0 : 1);
