import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Connect as the OWNER role (DIRECT_URL) — required to CREATE ROLE and GRANT.
config({ path: '.env.neon' });

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  throw new Error(
    'DIRECT_URL must be set (check .env.neon). This script provisions roles and requires the owner connection.',
  );
}

const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } },
});

function requirePassword(): string {
  const pw = process.env.CANALOG_APP_DB_PASSWORD;
  if (!pw || pw.length < 16) {
    throw new Error(
      'CANALOG_APP_DB_PASSWORD must be set (>=16 chars). Generate via `op item generate-password --length=32` and pass it in-process.',
    );
  }
  // Reject characters that could confuse SQL literal escaping. op-generated
  // passwords do not contain any of these. Rejecting here is strictly
  // stronger than escaping at call sites.
  if (/['"\\]/.test(pw) || pw.includes('\0')) {
    throw new Error(
      'CANALOG_APP_DB_PASSWORD must not contain quotes, backslash, or NUL. Regenerate via `op item generate-password --length=32 --words=0`.',
    );
  }
  return pw;
}

async function main() {
  const password = requirePassword();

  const existing = await prisma.$queryRawUnsafe<Array<{ rolname: string }>>(
    "SELECT rolname FROM pg_roles WHERE rolname = 'canalog_app'",
  );

  if (existing.length === 0) {
    console.info('Creating role canalog_app...');
    await prisma.$executeRawUnsafe(
      `CREATE ROLE canalog_app WITH LOGIN PASSWORD '${password.replace(/'/g, "''")}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT`,
    );
  } else {
    console.info('Role canalog_app already exists — skipping CREATE, re-applying password.');
    // Note: NOSUPERUSER/NOBYPASSRLS are omitted here because on Neon the owner
    // role (neondb_owner) lacks the SUPERUSER attribute required to re-declare
    // those flags on another role. The post-check below verifies they are
    // correct regardless of the path we took.
    await prisma.$executeRawUnsafe(
      `ALTER ROLE canalog_app WITH LOGIN PASSWORD '${password.replace(/'/g, "''")}'`,
    );
  }

  // If any subsequent grant fails, re-run this script — the CREATE/ALTER branch
  // above is idempotent and the grants are restated on every run.
  console.info('Granting USAGE on schema public...');
  await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO canalog_app');

  console.info('Granting DML on all existing tables...');
  await prisma.$executeRawUnsafe(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO canalog_app',
  );

  console.info('Granting USAGE, SELECT on all existing sequences...');
  await prisma.$executeRawUnsafe(
    'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO canalog_app',
  );

  console.info('Setting default privileges for future tables/sequences...');
  await prisma.$executeRawUnsafe(
    'ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO canalog_app',
  );
  await prisma.$executeRawUnsafe(
    'ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO canalog_app',
  );

  const attrs = await prisma.$queryRawUnsafe<
    Array<{ rolsuper: boolean; rolbypassrls: boolean; rolcanlogin: boolean }>
  >("SELECT rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = 'canalog_app'");
  console.info('Final canalog_app attributes:', attrs[0]);
  if (!attrs[0] || attrs[0].rolsuper || attrs[0].rolbypassrls || !attrs[0].rolcanlogin) {
    throw new Error('Post-provision sanity check failed — canalog_app has unexpected attributes.');
  }

  const privCheck = await prisma.$queryRawUnsafe<
    Array<{ has_select: boolean; has_insert: boolean }>
  >(
    "SELECT has_table_privilege('canalog_app', 'public.tenant', 'SELECT') AS has_select, has_table_privilege('canalog_app', 'public.tenant', 'INSERT') AS has_insert",
  );
  console.info('Sample grant check on public.tenant:', privCheck[0]);
  if (!privCheck[0]?.has_select || !privCheck[0]?.has_insert) {
    throw new Error(
      'Grants did not land — canalog_app is missing SELECT/INSERT on public.tenant. Rerun this script.',
    );
  }

  console.info('\nDone. Construct DATABASE_URL as:');
  console.info(
    '  postgresql://canalog_app:<password>@<pooled-host>/neondb?channel_binding=require&sslmode=require',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
