import { seedSystemRoles } from '@/platform/auth/seed-system-roles';
/**
 * Re-seed every tenant's system role rows with the latest SYSTEM_ROLE_DEFS.
 *
 * Idempotent: `seedSystemRoles` upserts on (tenantId, name). Custom roles
 * (isSystem=false) are not touched.
 *
 * Usage (local dev DB):
 *   pnpm tsx scripts/reseed-system-roles.ts
 *
 * Usage (Neon prod, requires DIRECT_URL with the canalog migration role):
 *   SKIP_DB_ROLE_CHECK=1 \
 *   DATABASE_URL="$DIRECT_URL" \
 *   pnpm tsx scripts/reseed-system-roles.ts
 *
 * The SKIP_DB_ROLE_CHECK env var bypasses the runtime guard in
 * `platform/db/prisma.ts` that forbids superuser DATABASE_URLs at boot.
 * It must NEVER be set in serverless runtime — only in one-shot scripts.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Re-seeding system roles for ${tenants.length} tenant(s)...`);

  for (const t of tenants) {
    await prisma.$transaction(async (tx) => {
      await seedSystemRoles(t.id, tx);
    });
    console.log(`  ✓ ${t.slug} (${t.name})`);
  }

  console.log('Done.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
