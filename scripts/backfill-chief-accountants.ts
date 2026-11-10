import { prisma } from '@/platform/db';

/**
 * Backfill: every membership with `bookkeeper` role also gets `chief_accountant`.
 * Idempotent — safe to run multiple times.
 */
async function main() {
  const bookkeeperRoles = await prisma.role.findMany({
    where: { name: 'bookkeeper', isSystem: true },
  });

  let created = 0;
  let skipped = 0;

  for (const bkRole of bookkeeperRoles) {
    const tenantId = bkRole.tenantId;

    // Find memberships that have the bookkeeper role
    const memberships = await prisma.membership.findMany({
      where: {
        tenantId,
        roles: { some: { id: bkRole.id } },
      },
      select: { id: true },
    });

    // Find or create chief_accountant role for this tenant
    let caRole = await prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name: 'chief_accountant' } },
    });

    if (!caRole) {
      caRole = await prisma.role.create({
        data: {
          tenantId,
          name: 'chief_accountant',
          description:
            'Top financial authority. All bookkeeping + period close + FX + currency + full audit.',
          isSystem: true,
          permissions: [
            '*:read',
            'sales.invoice:write|post|unpost',
            'sales.payment_received:write|post|unpost',
            'purchases.invoice:write|post|unpost',
            'purchases.payment_sent:write|post|unpost',
            'sales.customer:write',
            'purchases.supplier:write',
            'admin.fx:manage',
            'admin.period:manage',
            'admin.currency:manage',
            'admin.audit:read',
          ],
        },
      });
    }

    for (const membership of memberships) {
      const hasCa = await prisma.membership.findUnique({
        where: { id: membership.id },
        include: { roles: { where: { id: caRole.id } } },
      });

      if (hasCa && hasCa.roles.length === 0) {
        await prisma.membership.update({
          where: { id: membership.id },
          data: { roles: { connect: { id: caRole.id } } },
        });
        created++;
      } else {
        skipped++;
      }
    }
  }

  console.info(
    `Backfill complete: ${created} memberships promoted, ${skipped} already had chief_accountant.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
