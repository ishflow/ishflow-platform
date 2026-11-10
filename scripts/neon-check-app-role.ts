import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.neon' });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

async function main() {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      rolname: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
      rolcanlogin: boolean;
      rolinherit: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
    }>
  >(
    "SELECT rolname, rolsuper, rolbypassrls, rolcanlogin, rolinherit, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname IN ('canalog_app','neondb_owner') ORDER BY rolname",
  );
  console.info('Roles:', JSON.stringify(rows, null, 2));

  const privs = await prisma.$queryRawUnsafe<
    Array<{ has_select: boolean; has_insert: boolean; has_update: boolean; has_delete: boolean }>
  >(
    "SELECT has_table_privilege('canalog_app','public.tenant','SELECT') AS has_select, has_table_privilege('canalog_app','public.tenant','INSERT') AS has_insert, has_table_privilege('canalog_app','public.tenant','UPDATE') AS has_update, has_table_privilege('canalog_app','public.tenant','DELETE') AS has_delete",
  );
  console.info('canalog_app privs on public.tenant:', privs[0]);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
