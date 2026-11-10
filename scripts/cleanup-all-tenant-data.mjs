#!/usr/bin/env node
// Wipe all tenant-scoped data tables (catalogs, documents, document lines,
// movements, audit log, document sequence) across ALL tenants. Tenant/user/
// role/membership records are PRESERVED so sign-in still works.
// Local DB only — fails fast if pointing at Neon/prod.
import { PrismaClient } from '@prisma/client';

// Use DIRECT_URL (superuser role canalog) instead of the runtime canalog_app
// role; the latter can't TRUNCATE tables it doesn't own (e.g. audit_log).
const p = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL || '' } },
});

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
if (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
  console.error('REFUSED: DATABASE_URL is not pointing at localhost. Aborting.');
  process.exit(1);
}

async function main() {
  console.log('[cleanup] host:', dbUrl.replace(/.*@([^/]+)\/.*/, '$1'));

  // Discover tables dynamically so the script stays in sync with new modules.
  const rows = await p.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public'
         AND (table_name LIKE 'catalog_%'
              OR table_name LIKE 'document_%'
              OR table_name LIKE 'movement_%'
              OR table_name IN ('audit_log','document_sequence'))
       ORDER BY table_name;`,
  );
  const tables = rows.map((r) => r.table_name);
  console.log('[cleanup] tables to truncate:', tables.length);

  const list = tables.map((t) => `"${t}"`).join(', ');
  await p.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
  console.log('[cleanup] TRUNCATE done.');

  const tenants = await p.tenant.count();
  const users = await p.user.count();
  const products = await p.catalog_inventory_product.count();
  const currencies = await p.catalog_platform_currency.count();
  const docs = await p.document_sales_invoice.count();
  console.log(
    '[cleanup] after:  tenants=',
    tenants,
    ' users=',
    users,
    ' products=',
    products,
    ' currencies=',
    currencies,
    ' invoices=',
    docs,
  );

  await p.$disconnect();
}

main().catch((e) => {
  console.error('[cleanup] FAILED:', e);
  p.$disconnect();
  process.exit(1);
});
