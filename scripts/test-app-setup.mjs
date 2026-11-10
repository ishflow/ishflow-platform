#!/usr/bin/env node
/**
 * Idempotent test fixture setup for the next passes.
 * - Truncate all data tables
 * - Seed dev-bypass tenant + role + membership
 * - Set FX rates (TRY base)
 * - Pre-create canonical catalog rows so every document smoke can pick them
 *   without going through the browser flow each time.
 */
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const TENANT_ID = '00000000-0000-0000-0000-000000d3b001';
const USER_ID = '00000000-0000-0000-0000-000000d3b002';

const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const log = (...a) => console.log('[setup]', ...a);

async function truncate() {
  const rows = await db.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public'
         AND (table_name LIKE 'catalog_%'
              OR table_name LIKE 'document_%'
              OR table_name LIKE 'movement_%'
              OR table_name IN (
                'audit_log','document_sequence','fx_rate',
                'bank_account','bank_statement_import','bank_statement_row',
                'attachment','attachment_draft'
              ))`,
  );
  const list = rows.map((r) => `"${r.table_name}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
  log('truncated', rows.length, 'tables');
}

async function seedAuth() {
  await db.tenant.upsert({
    where: { id: TENANT_ID },
    create: {
      id: TENANT_ID,
      clerkOrgId: 'org_dev_bypass',
      name: 'Dev Bypass',
      slug: 'dev-bypass',
      currency: 'TRY',
      plan: 'enterprise',
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    update: { currency: 'TRY' },
  });
  await db.user.upsert({
    where: { id: USER_ID },
    create: {
      id: USER_ID,
      clerkId: 'user_dev_bypass',
      email: 'dev-bypass@localhost',
      firstName: 'Dev',
      lastName: 'Bypass',
    },
    update: {},
  });
  const owner = await db.role.upsert({
    where: { tenantId_name: { tenantId: TENANT_ID, name: 'owner' } },
    create: {
      tenantId: TENANT_ID,
      name: 'owner',
      description: 'Owner',
      isSystem: true,
      permissions: ['*:*'],
    },
    update: { permissions: ['*:*'] },
  });
  await db.membership.upsert({
    where: { tenantId_userId: { tenantId: TENANT_ID, userId: USER_ID } },
    create: { tenantId: TENANT_ID, userId: USER_ID, roles: { connect: { id: owner.id } } },
    update: { roles: { set: [{ id: owner.id }] } },
  });
  log('tenant + owner role + membership ready');
}

async function setFxRates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const { base, rate } of [
    { base: 'USD', rate: 32 },
    { base: 'EUR', rate: 35 },
    { base: 'RUB', rate: 0.4 },
    { base: 'KGS', rate: 0.37 },
  ]) {
    await db.fxRate.upsert({
      where: {
        tenantId_base_quote_date: { tenantId: TENANT_ID, base, quote: 'TRY', date: today },
      },
      create: { tenantId: TENANT_ID, base, quote: 'TRY', date: today, rate, source: 'MANUAL' },
      update: { rate, source: 'MANUAL' },
    });
  }
  log('FX rates: USD=32 EUR=35 RUB=0.4 KGS=0.37');
}

async function seedCatalogs() {
  // Currencies
  for (const c of [
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', enabled: true },
    { code: 'USD', name: 'US Dollar', symbol: '$', enabled: true },
    { code: 'EUR', name: 'Euro', symbol: '€', enabled: true },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', enabled: true },
    { code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'сом', enabled: true },
  ]) {
    await db.catalog_platform_currency.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: c.code } },
      create: { tenantId: TENANT_ID, ...c },
      update: { enabled: c.enabled },
    });
  }

  const warehouseAna = await db.catalog_inventory_warehouse.create({
    data: { tenantId: TENANT_ID, code: 'WH-001', name: 'Ana Depo', address: 'Istanbul' },
  });
  const warehouseSube = await db.catalog_inventory_warehouse.create({
    data: { tenantId: TENANT_ID, code: 'WH-002', name: 'Şube Depo', address: 'Ankara' },
  });
  const product = await db.catalog_inventory_product.create({
    data: {
      tenantId: TENANT_ID,
      code: 'P-001',
      name: 'Laptop X1',
      unit: 'adet',
      listPrice: 60000,
    },
  });
  const customer1 = await db.catalog_sales_customer.create({
    data: { tenantId: TENANT_ID, code: 'C-001', name: 'ABC Ticaret A.Ş.', phone: '0212' },
  });
  const customer2 = await db.catalog_sales_customer.create({
    data: { tenantId: TENANT_ID, code: 'C-002', name: 'Pacific Trade LLC', phone: '+1 415' },
  });
  const supplier = await db.catalog_purchases_supplier.create({
    data: { tenantId: TENANT_ID, code: 'S-001', name: 'XYZ Tedarik Ltd.', phone: '+7 495' },
  });

  // Cash registers (one per currency) — each starts with realistic opening
  // cash in its own currency. Opening balance is stored in the kasa's
  // currency (NOT base) per 1C model.
  const kasaTRY = await db.catalog_treasury_cash_register.create({
    data: {
      tenantId: TENANT_ID,
      code: 'K-001',
      name: 'Ana Kasa TRY',
      currency: 'TRY',
      openingBalance: 25000,
    },
  });
  const kasaUSD = await db.catalog_treasury_cash_register.create({
    data: {
      tenantId: TENANT_ID,
      code: 'K-002',
      name: 'Kasa USD',
      currency: 'USD',
      openingBalance: 500,
    },
  });
  const kasaRUB = await db.catalog_treasury_cash_register.create({
    data: {
      tenantId: TENANT_ID,
      code: 'K-003',
      name: 'Kasa RUB',
      currency: 'RUB',
      openingBalance: 1000000,
    },
  });

  // Static price type (needed by price-setting docs + customer.defaultPriceType)
  const priceTypeListTRY = await db.catalog_sales_price_type.create({
    data: {
      tenantId: TENANT_ID,
      code: 'PT-001',
      name: 'Liste TRY',
      kind: 'static',
      description: 'Default static price type (TRY)',
    },
  });

  // Bank accounts (no deletedAt on this legacy model)
  const bankTRY = await db.bankAccount.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Banka TRY',
      bankName: 'Garanti',
      accountNo: 'TR00 0000 0000 0001',
      currency: 'TRY',
    },
  });
  const bankUSD = await db.bankAccount.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Banka USD',
      bankName: 'Garanti',
      accountNo: 'TR00 0000 0000 0002',
      currency: 'USD',
    },
  });

  // Seed +50 Laptop X1 stock at Ana Depo so sales/transfer can deduct without
  // needing a prior purchase. Movement timestamp = epoch so subsequent docs
  // sort after it naturally.
  await db.movement_inventory_stock_balance.create({
    data: {
      tenantId: TENANT_ID,
      docRef: '00000000-0000-0000-0000-000000000001',
      docType: 'setup.opening',
      kind: 'income',
      active: true,
      timestamp: new Date('2020-01-01T00:00:00Z'),
      warehouse: warehouseAna.id,
      product: product.id,
      quantity: 50,
      totalCost: 50 * 20000, // 50 units @ 20.000 TRY base cost
    },
  });

  log(
    `catalogs: 5 ccy · 2 warehouses · 1 product (+50 stock seeded) · 2 customers · 1 supplier · ` +
      `3 kasalar · 2 banks · 1 priceType`,
  );

  return {
    tenantId: TENANT_ID,
    warehouseAnaId: warehouseAna.id,
    warehouseSubeId: warehouseSube.id,
    productId: product.id,
    customer1Id: customer1.id,
    customer2Id: customer2.id,
    supplierId: supplier.id,
    kasaTRYId: kasaTRY.id,
    kasaUSDId: kasaUSD.id,
    kasaRUBId: kasaRUB.id,
    bankTRYId: bankTRY.id,
    bankUSDId: bankUSD.id,
    priceTypeId: priceTypeListTRY.id,
  };
}

export async function setupFixtures() {
  await truncate();
  await seedAuth();
  await setFxRates();
  return await seedCatalogs();
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  await setupFixtures();
  await db.$disconnect();
  log('done');
}
