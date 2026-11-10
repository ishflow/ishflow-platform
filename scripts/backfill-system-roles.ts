import { seedSystemRoles } from '@/platform/auth/seed-system-roles';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';

async function main() {
  const tenants = await withBypass(async (tx) =>
    tx.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    }),
  );

  console.log(`Backfilling system roles for ${tenants.length} tenant(s)...`);
  let success = 0;
  let failed = 0;

  for (const tenant of tenants) {
    try {
      await withBypass(async (tx) => {
        await seedSystemRoles(tenant.id, tx);
      });
      success++;
      console.log(`  ✓ ${tenant.name} (${tenant.id})`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${tenant.name} (${tenant.id})`, err);
    }
  }

  console.log(`\nDone. ${success} succeeded, ${failed} failed.`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
