import { withBypass } from '@/platform/db/tenant-context';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { type PivotInput, computeGrossProfitPivot } from './gross-profit-pivot';

const TENANT = '00000000-0000-0000-0000-0000000000aa';
const WH_A = '00000000-0000-0000-0000-0000000000a0';
const CUST_X = '00000000-0000-0000-0000-0000000000c0';
const CUST_Y = '00000000-0000-0000-0000-0000000000c1';
const PROD_1 = '00000000-0000-0000-0000-0000000000d0';
const PROD_2 = '00000000-0000-0000-0000-0000000000d1';
const CAT_BEV = '00000000-0000-0000-0000-0000000000e0';
const GRP_CN = '00000000-0000-0000-0000-0000000000f0';

const FROM = new Date('2026-04-01T00:00:00Z');
const TO = new Date('2026-04-30T23:59:59Z');

async function seed() {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(`
      INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at)
      VALUES ('${WH_A}','${TENANT}','wh-a','Warehouse A', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);
    await tx.$executeRawUnsafe(`
      INSERT INTO catalog_inventory_product_category (id, tenant_id, name, created_at, updated_at)
      VALUES ('${CAT_BEV}','${TENANT}','Beverages', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);
    await tx.$executeRawUnsafe(`
      INSERT INTO catalog_inventory_product_group (id, tenant_id, name, created_at, updated_at)
      VALUES ('${GRP_CN}','${TENANT}','China', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);
    await tx.$executeRawUnsafe(`
      INSERT INTO catalog_inventory_product (id, tenant_id, code, name, category_id, group_id, created_at, updated_at)
      VALUES
        ('${PROD_1}','${TENANT}','p-1','Cola','${CAT_BEV}','${GRP_CN}', NOW(), NOW()),
        ('${PROD_2}','${TENANT}','p-2','Fanta','${CAT_BEV}',NULL, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);
    await tx.$executeRawUnsafe(`
      INSERT INTO catalog_sales_customer (id, tenant_id, name, created_at, updated_at)
      VALUES
        ('${CUST_X}','${TENANT}','Ahmet', NOW(), NOW()),
        ('${CUST_Y}','${TENANT}','Mehmet', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);
    await tx.$executeRawUnsafe(`
      INSERT INTO movement_sales_sale
        (id, tenant_id, doc_type, kind, active, "timestamp", counterparty, product, quantity, revenue, cost, doc_ref)
      VALUES
        ('${crypto.randomUUID()}','${TENANT}','sale','income',true,'2026-04-10','${CUST_X}','${PROD_1}',2,2000.00,1200.00,gen_random_uuid()),
        ('${crypto.randomUUID()}','${TENANT}','sale','income',true,'2026-04-12','${CUST_X}','${PROD_2}',1,800.00,500.00,gen_random_uuid()),
        ('${crypto.randomUUID()}','${TENANT}','sale','income',true,'2026-04-15','${CUST_Y}','${PROD_1}',5,5000.00,3000.00,gen_random_uuid())
      ON CONFLICT DO NOTHING;
    `);
  });
}

async function cleanup() {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(`DELETE FROM movement_sales_sale WHERE tenant_id = '${TENANT}';`);
    await tx.$executeRawUnsafe(
      `DELETE FROM catalog_inventory_product WHERE tenant_id = '${TENANT}';`,
    );
    await tx.$executeRawUnsafe(
      `DELETE FROM catalog_inventory_product_category WHERE tenant_id = '${TENANT}';`,
    );
    await tx.$executeRawUnsafe(
      `DELETE FROM catalog_inventory_product_group WHERE tenant_id = '${TENANT}';`,
    );
    await tx.$executeRawUnsafe(
      `DELETE FROM catalog_inventory_warehouse WHERE tenant_id = '${TENANT}';`,
    );
    await tx.$executeRawUnsafe(`DELETE FROM catalog_sales_customer WHERE tenant_id = '${TENANT}';`);
  });
}

beforeEach(async () => {
  await cleanup();
  await seed();
});

afterAll(async () => {
  await cleanup();
});

describe('computeGrossProfitPivot', () => {
  const baseInput: Omit<PivotInput, 'dimensions' | 'filters'> = {
    tenantId: TENANT,
    from: FROM,
    to: TO,
  };

  it('zero dimensions → single aggregate row, totals reflect everything', async () => {
    const result = await computeGrossProfitPivot({
      ...baseInput,
      dimensions: [],
      filters: {},
    });
    expect(result.rows).toHaveLength(0);
    expect(result.totals.qty).toBe(8);
    expect(result.totals.revenueMinor).toBe(780000n);
    expect(result.totals.costMinor).toBe(470000n);
    expect(result.totals.marginMinor).toBe(310000n);
    expect(result.totals.marginPct).toBeCloseTo((310000 / 780000) * 100, 2);
  });

  it('single dimension counterparty → 2 rows, 1 per customer', async () => {
    const result = await computeGrossProfitPivot({
      ...baseInput,
      dimensions: ['counterparty'],
      filters: {},
    });
    expect(result.rows).toHaveLength(2);
    const ahmet = result.rows.find((r) => r.key === CUST_X);
    expect(ahmet?.qty).toBe(3);
    expect(ahmet?.revenueMinor).toBe(280000n);
    const mehmet = result.rows.find((r) => r.key === CUST_Y);
    expect(mehmet?.qty).toBe(5);
    expect(mehmet?.revenueMinor).toBe(500000n);
  });

  it('single dimension category → 1 row (Beverages contains all products)', async () => {
    const result = await computeGrossProfitPivot({
      ...baseInput,
      dimensions: ['category'],
      filters: {},
    });
    const bev = result.rows.find((r) => r.key === CAT_BEV);
    expect(bev?.qty).toBe(8);
  });

  it('two dims [counterparty, product] → nested', async () => {
    const result = await computeGrossProfitPivot({
      ...baseInput,
      dimensions: ['counterparty', 'product'],
      filters: {},
    });
    expect(result.rows).toHaveLength(2);
    const ahmet = result.rows.find((r) => r.key === CUST_X);
    expect(ahmet?.children).toHaveLength(2);
    const mehmet = result.rows.find((r) => r.key === CUST_Y);
    expect(mehmet?.children).toHaveLength(1);
  });

  it('filter restricts to selected values', async () => {
    const result = await computeGrossProfitPivot({
      ...baseInput,
      dimensions: ['counterparty'],
      filters: { counterparty: [CUST_X] },
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.key).toBe(CUST_X);
    expect(result.totals.qty).toBe(3);
  });

  it('group filter excludes products without that group', async () => {
    const result = await computeGrossProfitPivot({
      ...baseInput,
      dimensions: ['product'],
      filters: { group: [GRP_CN] },
    });
    const productKeys = result.rows.map((r) => r.key);
    expect(productKeys).toContain(PROD_1);
    expect(productKeys).not.toContain(PROD_2);
  });

  it('empty result when date range has no movements', async () => {
    const result = await computeGrossProfitPivot({
      ...baseInput,
      from: new Date('2026-01-01'),
      to: new Date('2026-01-31'),
      dimensions: ['counterparty'],
      filters: {},
    });
    expect(result.rows).toEqual([]);
    expect(result.totals.qty).toBe(0);
    expect(result.totals.revenueMinor).toBe(0n);
    expect(result.totals.marginPct).toBe(0);
  });

  it('respects RLS — tenant B sees nothing in tenant A scope', async () => {
    const tenantB = '00000000-0000-0000-0000-0000000000bb';
    const result = await computeGrossProfitPivot({
      tenantId: tenantB,
      from: FROM,
      to: TO,
      dimensions: [],
      filters: {},
    });
    expect(result.totals.qty).toBe(0);
  });
});
