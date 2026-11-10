import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withTenant } from '@/platform/db/tenant-context';
import { defineInformationRegister, field } from '@/platform/metadata';
import { clearRegistry } from '@/platform/metadata/registry';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { informationRegisterAt, informationRegisterSlice } from './information-register-query';

const TENANT = randomUUID();
const PRODUCT_A = randomUUID();
const PRODUCT_B = randomUUID();
const TYPE_RETAIL = randomUUID();

let register: ReturnType<typeof defineInformationRegister>;

beforeAll(async () => {
  clearRegistry();
  register = defineInformationRegister({
    module: 'inventory',
    name: 'product_price',
    label: { en: 'Product Prices', ru: 'Цены номенклатуры', tr: 'Ürün Fiyatları' },
    periodicity: 'date',
    dimensions: {
      product: field.reference({
        label: { en: 'Product' },
        required: true,
        to: { kind: 'ref', module: 'inventory', name: 'product' },
      }),
      priceType: field.reference({
        label: { en: 'Price Type' },
        required: true,
        to: { kind: 'ref', module: 'sales', name: 'price_type' },
      }),
    },
    resources: { price: field.money({ label: { en: 'Price' }, required: true }) },
    recorder: { module: 'inventory', name: 'price_setting' },
    permissions: { read: 'any' },
  });

  await withTenant(TENANT, async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not yet typed (Task 6 lands the model)
    const bag = tx as any;
    await bag.register_inventory_product_price.createMany({
      data: [
        {
          tenantId: TENANT,
          period: new Date('2026-01-01'),
          product: PRODUCT_A,
          priceType: TYPE_RETAIL,
          price: 100,
        },
        {
          tenantId: TENANT,
          period: new Date('2026-04-01'),
          product: PRODUCT_A,
          priceType: TYPE_RETAIL,
          price: 110,
        },
        {
          tenantId: TENANT,
          period: new Date('2026-04-01'),
          product: PRODUCT_B,
          priceType: TYPE_RETAIL,
          price: 50,
        },
      ],
    });
  });
});

afterAll(async () => {
  await withTenant(TENANT, async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not yet typed (Task 6 lands the model)
    const bag = tx as any;
    await bag.register_inventory_product_price.deleteMany({ where: { tenantId: TENANT } });
  });
  await prisma.$disconnect();
});

describe('informationRegisterAt', () => {
  it('returns latest row at-or-before asOf', async () => {
    await withTenant(TENANT, async (tx) => {
      const r = await informationRegisterAt(
        tx,
        register,
        { product: PRODUCT_A, priceType: TYPE_RETAIL },
        new Date('2026-03-15'),
      );
      expect(Number(r?.price)).toBe(100);
    });
  });

  it('respects later period when asOf passes it', async () => {
    await withTenant(TENANT, async (tx) => {
      const r = await informationRegisterAt(
        tx,
        register,
        { product: PRODUCT_A, priceType: TYPE_RETAIL },
        new Date('2026-04-15'),
      );
      expect(Number(r?.price)).toBe(110);
    });
  });

  it('returns null when no row matches', async () => {
    await withTenant(TENANT, async (tx) => {
      const r = await informationRegisterAt(
        tx,
        register,
        { product: PRODUCT_A, priceType: TYPE_RETAIL },
        new Date('2025-01-01'),
      );
      expect(r).toBeNull();
    });
  });

  it('ignores soft-deleted rows', async () => {
    await withTenant(TENANT, async (tx) => {
      // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not yet typed (Task 6)
      const bag = tx as any;
      await bag.register_inventory_product_price.updateMany({
        where: {
          tenantId: TENANT,
          product: PRODUCT_A,
          priceType: TYPE_RETAIL,
          period: new Date('2026-04-01'),
        },
        data: { deletedAt: new Date() },
      });
      const r = await informationRegisterAt(
        tx,
        register,
        { product: PRODUCT_A, priceType: TYPE_RETAIL },
        new Date('2026-04-15'),
      );
      expect(Number(r?.price)).toBe(100);
      // restore for other tests
      await bag.register_inventory_product_price.updateMany({
        where: {
          tenantId: TENANT,
          product: PRODUCT_A,
          priceType: TYPE_RETAIL,
          period: new Date('2026-04-01'),
        },
        data: { deletedAt: null },
      });
    });
  });
});

describe('informationRegisterSlice', () => {
  it('returns one row per dimension tuple at-or-before asOf', async () => {
    await withTenant(TENANT, async (tx) => {
      const rows = await informationRegisterSlice(
        tx,
        register,
        { priceType: TYPE_RETAIL },
        new Date('2026-04-15'),
      );
      // biome-ignore lint/suspicious/noExplicitAny: row shape not yet typed
      const byProduct = new Map(rows.map((r: any) => [r.product, Number(r.price)]));
      expect(byProduct.get(PRODUCT_A)).toBe(110);
      expect(byProduct.get(PRODUCT_B)).toBe(50);
      expect(rows.length).toBe(2);
    });
  });
});
