import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? '' } },
});
async function main() {
  const cols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_name = 'catalog_sales_price_type' AND column_name = 'markupPct'
  `);
  console.log('markupPct column type:', cols[0]);

  const rows: any = await prisma.$queryRawUnsafe(
    `SELECT id, name, "markupPct" FROM catalog_sales_price_type WHERE "markupPct" IS NOT NULL`,
  );
  console.log(`\n${rows.length} rows with markupPct:`);
  for (const r of rows) console.log(`  ${r.name}: ${r.markupPct}`);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
