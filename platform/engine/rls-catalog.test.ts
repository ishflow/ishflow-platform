import { randomUUID } from 'node:crypto';
import '@/configs/inventory/registers/product-price';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { getRegistry } from '@/platform/metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRecord, listRecords } from './crud';

const tenantA = randomUUID();
const tenantB = randomUUID();
const ctxA = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantA } as never,
  membership: { roles: ['admin'] } as never,
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;
const ctxB = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantB } as never,
  membership: { roles: ['admin'] } as never,
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;

const config = getRegistry().catalog['sales.customer'];
if (!config) throw new Error('sales.customer config not registered');
const priceConfig = getRegistry().catalog['sales.price_agreement'];
if (!priceConfig) throw new Error('sales.price_agreement config not registered');
const priceTypeConfig = getRegistry().catalog['sales.price_type'];
if (!priceTypeConfig) throw new Error('sales.price_type config not registered');
const productPriceConfig = getRegistry().catalog['inventory.product_price'];
if (!productPriceConfig) throw new Error('inventory.product_price config not registered');

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantA,
        clerkOrgId: `org_${tenantA}`,
        name: 'Tenant A',
        slug: `rls-a-${tenantA.slice(0, 8)}`,
      },
    });
    await tx.tenant.create({
      data: {
        id: tenantB,
        clerkOrgId: `org_${tenantB}`,
        name: 'Tenant B',
        slug: `rls-b-${tenantB.slice(0, 8)}`,
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_product_price WHERE tenant_id IN ($1::uuid, $2::uuid)',
      tenantA,
      tenantB,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_sales_price_type WHERE tenant_id IN ($1::uuid, $2::uuid)',
      tenantA,
      tenantB,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_sales_price_agreement WHERE tenant_id IN ($1::uuid, $2::uuid)',
      tenantA,
      tenantB,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_sales_customer WHERE tenant_id IN ($1::uuid, $2::uuid)',
      tenantA,
      tenantB,
    );
    await tx.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  });
  await prisma.$disconnect();
});

describe('RLS — catalog_sales_customer isolation', () => {
  it('tenant B cannot see tenant A records via listRecords', async () => {
    const marker = `RLS-A-${randomUUID()}`;
    await createRecord(ctxA, config, { name: marker });

    const bRows = await listRecords(ctxB, config);
    expect(bRows.some((r) => r.name === marker)).toBe(false);

    const aRows = await listRecords(ctxA, config);
    expect(aRows.some((r) => r.name === marker)).toBe(true);
  });

  it('raw findMany under tenant B app.tenant_id never returns tenant A rows', async () => {
    const marker = `RLS-Raw-${randomUUID()}`;
    await createRecord(ctxA, config, { name: marker });

    const rowsUnderB = await withTenant(tenantB, (tx) =>
      (
        tx as unknown as {
          catalog_sales_customer: { findMany: (args: unknown) => Promise<unknown[]> };
        }
      ).catalog_sales_customer.findMany({ where: { deletedAt: null } }),
    );
    expect((rowsUnderB as Array<{ name?: string }>).some((r) => r.name === marker)).toBe(false);
  });
});

describe('RLS — catalog_sales_price_agreement isolation', () => {
  it('tenant B cannot see tenant A records via listRecords', async () => {
    // counterparty + product are literal UUIDs — no FK constraints per house style.
    // fixedPrice is the marker (unique value per row avoids unique-index collisions).
    const marker = Math.floor(Math.random() * 900_000) + 100_000;
    await createRecord(ctxA, priceConfig, {
      counterparty: randomUUID(),
      product: randomUUID(),
      fixedPrice: marker,
      validFrom: new Date('2026-01-01'),
      validTo: null,
    });

    const bRows = await listRecords(ctxB, priceConfig);
    expect(
      (bRows as Array<{ fixedPrice?: unknown }>).some((r) => Number(r.fixedPrice) === marker),
    ).toBe(false);

    const aRows = await listRecords(ctxA, priceConfig);
    expect(
      (aRows as Array<{ fixedPrice?: unknown }>).some((r) => Number(r.fixedPrice) === marker),
    ).toBe(true);
  });

  it('raw findMany under tenant B app.tenant_id never returns tenant A rows', async () => {
    const marker = Math.floor(Math.random() * 900_000) + 100_000;
    await createRecord(ctxA, priceConfig, {
      counterparty: randomUUID(),
      product: randomUUID(),
      fixedPrice: marker,
      validFrom: new Date('2026-01-01'),
      validTo: null,
    });

    const rowsUnderB = await withTenant(tenantB, (tx) =>
      (
        tx as unknown as {
          catalog_sales_price_agreement: { findMany: (args: unknown) => Promise<unknown[]> };
        }
      ).catalog_sales_price_agreement.findMany({ where: { deletedAt: null } }),
    );
    expect(
      (rowsUnderB as Array<{ fixedPrice?: unknown }>).some((r) => Number(r.fixedPrice) === marker),
    ).toBe(false);
  });
});

describe('RLS — catalog_sales_price_type isolation', () => {
  it('tenant B cannot see tenant A records via listRecords', async () => {
    const marker = `RLS-PT-A-${randomUUID()}`;
    await createRecord(ctxA, priceTypeConfig, {
      name: marker,
      description: null,
      markupPct: null,
      isDefault: null,
    });

    const bRows = await listRecords(ctxB, priceTypeConfig);
    expect((bRows as Array<{ name?: string }>).some((r) => r.name === marker)).toBe(false);

    const aRows = await listRecords(ctxA, priceTypeConfig);
    expect((aRows as Array<{ name?: string }>).some((r) => r.name === marker)).toBe(true);
  });

  it('raw findMany under tenant B app.tenant_id never returns tenant A rows', async () => {
    const marker = `RLS-PT-Raw-${randomUUID()}`;
    await createRecord(ctxA, priceTypeConfig, {
      name: marker,
      description: null,
      markupPct: null,
      isDefault: null,
    });

    const rowsUnderB = await withTenant(tenantB, (tx) =>
      (
        tx as unknown as {
          catalog_sales_price_type: { findMany: (args: unknown) => Promise<unknown[]> };
        }
      ).catalog_sales_price_type.findMany({ where: { deletedAt: null } }),
    );
    expect((rowsUnderB as Array<{ name?: string }>).some((r) => r.name === marker)).toBe(false);
  });
});

describe('RLS — catalog_inventory_product_price isolation', () => {
  it('tenant B cannot see tenant A records via listRecords', async () => {
    // Use a unique price value as marker. product + priceType are literal UUIDs —
    // no FK constraints per house style.
    const marker = Math.floor(Math.random() * 900_000) + 100_000;
    await createRecord(ctxA, productPriceConfig, {
      product: randomUUID(),
      priceType: randomUUID(),
      price: marker,
      validFrom: new Date('2026-01-01'),
    });

    const bRows = await listRecords(ctxB, productPriceConfig);
    expect((bRows as Array<{ price?: unknown }>).some((r) => Number(r.price) === marker)).toBe(
      false,
    );

    const aRows = await listRecords(ctxA, productPriceConfig);
    expect((aRows as Array<{ price?: unknown }>).some((r) => Number(r.price) === marker)).toBe(
      true,
    );
  });

  it('raw findMany under tenant B app.tenant_id never returns tenant A rows', async () => {
    const marker = Math.floor(Math.random() * 900_000) + 100_000;
    await createRecord(ctxA, productPriceConfig, {
      product: randomUUID(),
      priceType: randomUUID(),
      price: marker,
      validFrom: new Date('2026-01-01'),
    });

    const rowsUnderB = await withTenant(tenantB, (tx) =>
      (
        tx as unknown as {
          catalog_inventory_product_price: {
            findMany: (args: unknown) => Promise<unknown[]>;
          };
        }
      ).catalog_inventory_product_price.findMany({ where: { deletedAt: null } }),
    );
    expect((rowsUnderB as Array<{ price?: unknown }>).some((r) => Number(r.price) === marker)).toBe(
      false,
    );
  });
});
