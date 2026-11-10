import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const rows: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='tenant_id'
    ORDER BY table_name
  `);
  await prisma.$executeRawUnsafe(`SET app.bypass_rls = 'on'`);
  for (const { table_name } of rows) {
    const res: any = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::text AS c FROM "${table_name}"`,
    );
    if (res[0].c !== '0') console.log(`${res[0].c.padStart(6)} ${table_name}`);
  }
  await prisma.$disconnect();
})();
