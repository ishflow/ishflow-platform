import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.neon' });

const prisma = new PrismaClient();

async function main() {
  const who = await prisma.$queryRawUnsafe<Array<{ current_user: string; session_user: string }>>(
    'SELECT current_user, session_user',
  );
  console.info('WHO:', who);

  const roles = await prisma.$queryRawUnsafe<Array<unknown>>(
    `SELECT rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
     FROM pg_roles
     WHERE rolname = current_user OR rolname LIKE 'canalog%' OR rolname LIKE 'neon%'
     ORDER BY rolname`,
  );
  console.info('ROLES:', JSON.stringify(roles, null, 2));

  const tableOwners = await prisma.$queryRawUnsafe<Array<unknown>>(
    `SELECT tableowner, count(*)::int AS n
     FROM pg_tables
     WHERE schemaname='public'
     GROUP BY tableowner`,
  );
  console.info('TABLE_OWNERS:', tableOwners);

  const rls = await prisma.$queryRawUnsafe<Array<unknown>>(
    `SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname IN ('catalog_sales_customer','catalog_purchases_supplier','catalog_inventory_product','membership','tenant','audit_log','document_sales_invoice','role','role_scope')
     ORDER BY c.relname`,
  );
  console.info('RLS:', JSON.stringify(rls, null, 2));

  const counts: Record<string, number> = {};
  for (const t of [
    'tenant',
    '"user"',
    'membership',
    'catalog_sales_customer',
    'catalog_purchases_supplier',
    'catalog_inventory_product',
    'document_sales_invoice',
    'role',
  ]) {
    try {
      const r = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
        `SELECT count(*)::int AS c FROM ${t}`,
      );
      counts[t] = r[0] ? Number(r[0].c) : -1;
    } catch {
      counts[t] = -1;
    }
  }
  console.info('COUNTS:', counts);

  const leakTest = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000000'");
    const r = await tx.$queryRawUnsafe<Array<{ c: number }>>(
      'SELECT count(*)::int AS c FROM catalog_sales_customer',
    );
    return r[0] ? Number(r[0].c) : -1;
  });
  console.info('LEAK_TEST_customers_with_fake_tenant_id:', leakTest, '(expect 0 if RLS works)');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
