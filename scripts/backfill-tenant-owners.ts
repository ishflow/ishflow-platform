import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';

async function main() {
  const tenants = await withBypass(async (tx) =>
    tx.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true },
    }),
  );

  console.info(`Checking ${tenants.length} tenant(s) for missing owners...`);
  let promoted = 0;
  let skipped = 0;
  let failed = 0;

  for (const tenant of tenants) {
    try {
      const ownerCount = await withBypass(async (tx) =>
        tx.membership.count({
          where: {
            tenantId: tenant.id,
            roles: { some: { name: 'owner', isSystem: true } },
          },
        }),
      );

      if (ownerCount > 0) {
        skipped++;
        continue;
      }

      const oldestAdmin = await withBypass(async (tx) =>
        tx.membership.findFirst({
          where: {
            tenantId: tenant.id,
            roles: { some: { name: 'admin', isSystem: true } },
          },
          orderBy: { createdAt: 'asc' },
          include: { user: true },
        }),
      );

      if (!oldestAdmin) {
        console.info(`  ⚠ ${tenant.slug} — no admin found to promote`);
        skipped++;
        continue;
      }

      await withBypass(async (tx) => {
        const ownerRole = await tx.role.findUniqueOrThrow({
          where: { tenantId_name: { tenantId: tenant.id, name: 'owner' } },
        });
        await tx.membership.update({
          where: { id: oldestAdmin.id },
          data: {
            roles: { connect: { id: ownerRole.id } },
          },
        });
      });

      promoted++;
      console.info(`  ✓ ${tenant.slug} — promoted ${oldestAdmin.user.email} to owner`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${tenant.slug}`, err);
    }
  }

  console.info(`\nDone. ${promoted} promoted, ${skipped} skipped, ${failed} failed.`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
