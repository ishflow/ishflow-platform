// Scenario 2 — "Tech Hub: güvenlik incident response cycle"
//
// Bir tenant'tan şüpheli login aktivitesi raporu geldi. SA operatörü:
//   1. Hesabı anında askıya alır (reason: investigating)
//   2. Bir "security-review" tag'i ekler
//   3. Triage notu ekler
//   4. (İnceleme sonu — temiz)
//   5. Askıyı kaldırır
//   6. Resolution notu ekler
//
// Bu senaryo: suspend/lift cycle + notes/tags coordination test.

import { PrismaClient } from '@prisma/client';

const log = console.info;
const SLUG = 'demo-sa-tech-hub';

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const tenant = await prisma.tenant.findFirst({
  where: { slug: SLUG },
  select: { id: true, name: true, status: true },
});
if (!tenant) {
  console.error(`No tenant ${SLUG}.`);
  process.exit(1);
}
log('tenant:', tenant.name, '|', tenant.status);

// Wipe prior scenario state
await prisma.tenantTag.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantNote.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenantSuspension.deleteMany({ where: { tenantId: tenant.id } });
await prisma.tenant.update({
  where: { id: tenant.id },
  data: { status: 'active' },
});
log('✓ baseline: status=active, no tags/notes/suspensions');

// Add incident-report note
const sysUser =
  (await prisma.user.findFirst({
    where: { id: '00000000-0000-0000-0000-000000d3b002' },
    select: { id: true },
  })) ?? (await prisma.user.findFirst({ select: { id: true } }));
if (!sysUser) {
  console.error('No user available.');
  process.exit(1);
}

await prisma.tenantNote.create({
  data: {
    tenantId: tenant.id,
    createdBy: sysUser.id,
    body: [
      '[SECURITY-INCIDENT] Sentry abuse-detector triggered:',
      '',
      '- 14 failed login attempts on owner account dev@techhub.local',
      '  in 90 seconds, from 4 different countries (TR / RU / KZ / VN).',
      '- Suspect credential stuffing.',
      '- Customer notified via email, asked to confirm activity.',
      '',
      'Triage required:',
      '1) Suspend account immediately',
      '2) Tag for follow-up: "security-review"',
      '3) Triage note documenting timeline',
      '4) Wait for customer response',
      '5) Lift suspension once cleared',
      '',
      'Source: Sentry abuse-monitor at 2026-05-23T14:22:00Z',
    ].join('\n'),
    createdAt: new Date('2026-05-23T14:24:00Z'),
  },
});
log('✓ added incident-report note');

await prisma.$disconnect();
log('\n✅ scenario-2 setup complete — Tech Hub awaits triage.');
