import '@/configs';

import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { resolvePrice } from '@/platform/engine/pricing';
import { type AccumulationRegisterConfig, getRegistry } from '@/platform/metadata';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const TENANT = randomUUID();
const PRODUCT = randomUUID();
const TYPE_RETAIL = randomUUID();
const PERIOD = new Date('2026-04-01');
const ASOF = new Date('2026-04-25T12:00:00Z');

beforeEach(async () => {
  await withBypass(async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed
    const bag = tx as any;
    await bag.register_inventory_product_price.deleteMany({ where: { tenantId: TENANT } });
    await bag.catalog_inventory_product.deleteMany({ where: { tenantId: TENANT } });
    await bag.catalog_sales_price_type.deleteMany({ where: { tenantId: TENANT } });
    await bag.catalog_inventory_product.create({
      data: { id: PRODUCT, tenantId: TENANT, code: 'P-LP', name: 'Test product' },
    });
    await bag.catalog_sales_price_type.create({
      data: { id: TYPE_RETAIL, tenantId: TENANT, name: 'Retail-Test', kind: 'static' },
    });
    await bag.register_inventory_product_price.create({
      data: {
        tenantId: TENANT,
        period: PERIOD,
        product: PRODUCT,
        priceType: TYPE_RETAIL,
        price: 75,
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed
    const bag = tx as any;
    await bag.register_inventory_product_price.deleteMany({ where: { tenantId: TENANT } });
    await bag.catalog_inventory_product.deleteMany({ where: { tenantId: TENANT } });
    await bag.catalog_sales_price_type.deleteMany({ where: { tenantId: TENANT } });
  });
  await prisma.$disconnect();
});

describe('resolvePrice — Layer 2 register lookup integration', () => {
  it('returns stored:<typeId> with price 75 for static priceType + register row', async () => {
    // stockRegister is only used by the Layer 3 cost-lookup path. The Layer 2
    // path (under test) goes through resolvePriceForType + informationRegisterAt
    // against `inventory.product_price` regardless of this argument.
    const stockRegister = getRegistry().register['inventory.stock_balance'] as
      | AccumulationRegisterConfig
      | undefined;
    if (!stockRegister) throw new Error('inventory.stock_balance register not registered');

    const result = await withTenant(TENANT, (tx) =>
      resolvePrice(tx, stockRegister, {
        tenantId: TENANT,
        customerId: randomUUID(),
        productId: PRODUCT,
        date: ASOF,
        priceTypeId: TYPE_RETAIL,
      }),
    );

    expect(result.source).toBe(`stored:${TYPE_RETAIL}`);
    expect(Number(result.price)).toBe(75);
  });
});
