// Scenario 1 — "Acme Trading: Mayıs anniversary toplu krizi"
//
// Bir gerçek ops senaryosunda CSM/Support'a düşen multi-issue ticket'ını
// simüle eder. Bu script demo-sa-acme tenant'ına 6 farklı problem state'ini
// yazar ki SA operatörü scenario-1-resolve.mjs ile bunları çözmeye çalışsın.
//
// Sorunlar:
//   1. plan=business→free, status=active→past_due (kart iki kez döndü)
//   2. mevcut TenantPriceOverride sil (Free plan default'a dön)
//   3. feature_kill: marketplace_sync (3 hafta önce güvenlik incident)
//   4. ayşe yılmaz - departed accountant (seed user + membership)
//   5. triage tags + notes wipe → temiz başlangıç
//   6. CSM triage note ekle ("Acme Trading müşterimiz şu sorunları bildirdi…")
//
// Usage: pnpm dotenv -e .env.local -- node scripts/scenario-1-setup.mjs
import { PrismaClient } from '@prisma/client';

const log = console.info;
const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const SLUG = 'demo-sa-acme';
const DEPARTED_EMAIL = 'ayse.yilmaz@acme-trading.test';
const DEPARTED_CLERK = 'scenario1_clerk_ayse';

const tenant = await prisma.tenant.findFirst({
  where: { slug: SLUG },
  select: { id: true, name: true },
});
if (!tenant) {
  console.error(`No tenant found with slug=${SLUG}. Seed demo first.`);
  process.exit(1);
}
log('tenant:', tenant.name, tenant.id);

// 1. Plan + status → broken state
await prisma.tenant.update({
  where: { id: tenant.id },
  data: { plan: 'free', status: 'past_due' },
});
log('✓ set plan=free, status=past_due');

// 2. Clear any existing price override so we're back to "no override"
await prisma.tenantPriceOverride.deleteMany({ where: { tenantId: tenant.id } });
log('✓ cleared price override');

// 3. Drop addon entitlements so AI OCR is OFF
await prisma.tenantAddon.deleteMany({ where: { tenantId: tenant.id } });
log('✓ cleared addons (AI OCR will need re-enable)');

// 4. Wipe tags + notes for clean slate
await prisma.tenantTag.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantNote.deleteMany({ where: { tenantId: tenant.id } });
log('✓ cleared tags + notes');

// 5. Drop any existing feature kills, then add marketplace_sync kill
await prisma.tenantFeatureKill.deleteMany({ where: { tenantId: tenant.id } });

// Need a UUID for killed_by — use the dev-bypass user if it exists, otherwise the first user
const sysUser =
  (await prisma.user.findFirst({
    where: { id: '00000000-0000-0000-0000-000000d3b002' },
    select: { id: true },
  })) ?? (await prisma.user.findFirst({ select: { id: true } }));
if (!sysUser) {
  console.error('No user in DB to attribute the feature_kill to.');
  process.exit(1);
}

await prisma.tenantFeatureKill.create({
  data: {
    tenantId: tenant.id,
    featureKey: 'marketplace_sync',
    reason: 'Wildberries hesabında şüpheli aktivite — 2026-04-30',
    killedAt: new Date('2026-04-30T14:22:00Z'),
    killedBy: sysUser.id,
  },
});
log('✓ added feature_kill: marketplace_sync');

// 6. Seed Ayşe Yılmaz (departed accountant) — User + Membership
// First make sure a tenant role exists to attach to her
let accountantRole = await prisma.role.findFirst({
  where: { tenantId: tenant.id, name: 'accountant' },
  select: { id: true },
});
if (!accountantRole) {
  accountantRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'accountant',
      isSystem: false,
      permissions: [],
    },
    select: { id: true },
  });
  log('✓ created accountant role');
}

// Idempotent: delete existing scenario user (if rerun) so we re-create cleanly
const existingAyse = await prisma.user.findUnique({
  where: { clerkId: DEPARTED_CLERK },
});
if (existingAyse) {
  await prisma.user.delete({ where: { id: existingAyse.id } });
}

const ayse = await prisma.user.create({
  data: {
    clerkId: DEPARTED_CLERK,
    email: DEPARTED_EMAIL,
    firstName: 'Ayşe',
    lastName: 'Yılmaz',
  },
});
await prisma.membership.create({
  data: {
    tenantId: tenant.id,
    userId: ayse.id,
    roles: { connect: [{ id: accountantRole.id }] },
  },
});
log('✓ seeded departed accountant: Ayşe Yılmaz <ayse.yilmaz@acme-trading.test>');

// 7. CSM triage note — the ticket that landed
await prisma.tenantNote.create({
  data: {
    tenantId: tenant.id,
    createdBy: sysUser.id,
    body: [
      '[CSM TICKET] Acme Trading — Mayıs anniversary toplu krizi:',
      '',
      '1. Kart iki kez döndü (Stripe past_due). CFO yıllık kontrata geçmek istiyor;',
      '   bizim taraf $0/ay (faturalama dışarıdan, USD wire transfer alındı 2026-05-15).',
      "2. AI Invoice OCR feature istiyorlar. Free plan'da kapalı — Pro'ya geçince açılacak.",
      '3. 3 hafta önce Wildberries security alert nedeniyle marketplace_sync feature_kill koyulmuştu.',
      '   Müşterinin Wildberries hesabını yeniden doğruladık — kill kaldırılmalı.',
      '4. Eski muhasebeci Ayşe Yılmaz işten ayrıldı (2026-05-10). Hesabını kapatın.',
      "5. Yeni muhasebeci Murat Sönmez davet edilecek — invite akışı Faz C'de, şimdilik manuel atla.",
      '6. Triajı kolaylaştırmak için "high-value" + "annual-contract" tag\'leri eklensin.',
      '',
      "Karar verici: CSM Lead onayladı. Goodwill upgrade Pro'ya + custom price $0.",
    ].join('\n'),
    createdAt: new Date('2026-05-23T08:14:00Z'),
  },
});
log('✓ added CSM triage note');

await prisma.$disconnect();
log('\n✅ scenario-1 setup complete. demo-sa-acme is now in BROKEN state.');
log('   Run scripts/scenario-1-resolve.mjs to watch the SA fix flow in Chromium.');
