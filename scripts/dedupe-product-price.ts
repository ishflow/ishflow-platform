import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '' } },
});

async function main() {
  const dupes: Array<{ tenant_id: string; product: string; validFrom: Date; cnt: bigint }> =
    await prisma.$queryRawUnsafe(`
      SELECT tenant_id, product, "validFrom", COUNT(*)::bigint as cnt
      FROM catalog_inventory_product_price
      GROUP BY tenant_id, product, "validFrom"
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
    `);

  console.log(`Found ${dupes.length} duplicate groups`);
  for (const d of dupes) {
    console.log(
      `  tenant=${d.tenant_id} product=${d.product} validFrom=${d.validFrom.toISOString()} cnt=${d.cnt}`,
    );
  }

  if (dupes.length === 0) return;

  const arg = process.argv[2];
  if (arg !== '--apply') {
    console.log(
      '\nDry run. Pass --apply to delete older rows (keeps row with greatest "updatedAt" / "createdAt").',
    );
    return;
  }

  let totalDeleted = 0;
  for (const d of dupes) {
    const rows: Array<{ id: string; created_at: Date; updated_at: Date | null }> =
      await prisma.$queryRawUnsafe(
        `SELECT id, created_at, updated_at
         FROM catalog_inventory_product_price
         WHERE tenant_id = $1::uuid AND product = $2::uuid AND "validFrom" = $3
         ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC`,
        d.tenant_id,
        d.product,
        d.validFrom,
      );
    const [keep, ...drop] = rows;
    if (!keep || drop.length === 0) continue;
    console.log(`  keep ${keep.id}, drop ${drop.map((r) => r.id).join(', ')}`);
    const ids = drop.map((r) => r.id);
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM catalog_inventory_product_price WHERE id = ANY($1::uuid[])`,
      ids,
    );
    totalDeleted += Number(result);
  }
  console.log(`\nDeleted ${totalDeleted} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
