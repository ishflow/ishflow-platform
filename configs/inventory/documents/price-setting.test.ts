import '@/configs';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { createDocument, postDocument, unpostDocument } from '@/platform/engine';
import { informationRegisterAt } from '@/platform/engine/information-register-query';
import { getRegistry } from '@/platform/metadata';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const TENANT = randomUUID();
const PRODUCT = randomUUID();
const TYPE_RETAIL = randomUUID();
const TYPE_VIP = randomUUID();

// AppContext stub — minimal shape for postDocument's checkDoc (permissions='any' → early return)
// and scopeMatches (empty scopesByEntity → returns true).
// biome-ignore lint/suspicious/noExplicitAny: tests stub minimal AppContext shape
const ctxFor = (): any => ({
  tenant: { id: TENANT, currency: 'USD' },
  user: { id: randomUUID() },
  membership: null,
  permissions: new Set<string>(),
  scopesByEntity: new Map(),
});

beforeEach(async () => {
  await withBypass(async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed
    const bag = tx as any;
    await bag.register_inventory_product_price.deleteMany({ where: { tenantId: TENANT } });
    await bag.documentLine_inventory_price_setting_items.deleteMany({
      where: { tenantId: TENANT },
    });
    await bag.document_inventory_price_setting.deleteMany({ where: { tenantId: TENANT } });
    await bag.catalog_sales_price_type.deleteMany({ where: { tenantId: TENANT } });
    await bag.catalog_inventory_product.deleteMany({ where: { tenantId: TENANT } });
    await bag.catalog_inventory_product.create({
      data: { id: PRODUCT, tenantId: TENANT, code: 'P-T1', name: 'Test product' },
    });
    await bag.catalog_sales_price_type.create({
      data: { id: TYPE_RETAIL, tenantId: TENANT, code: 'RETAIL01', name: 'Retail', kind: 'static' },
    });
    await bag.catalog_sales_price_type.create({
      data: {
        id: TYPE_VIP,
        tenantId: TENANT,
        code: 'VIP00001',
        name: 'VIP',
        kind: 'dynamic',
        basePriceType: TYPE_RETAIL,
        markupPct: 0.1,
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed
    const bag = tx as any;
    await bag.register_inventory_product_price.deleteMany({ where: { tenantId: TENANT } });
    await bag.documentLine_inventory_price_setting_items.deleteMany({
      where: { tenantId: TENANT },
    });
    await bag.document_inventory_price_setting.deleteMany({ where: { tenantId: TENANT } });
    await bag.catalog_inventory_product.deleteMany({ where: { tenantId: TENANT } });
    await bag.catalog_sales_price_type.deleteMany({ where: { tenantId: TENANT } });
  });
  await prisma.$disconnect();
});

describe('price_setting posting', () => {
  it('posts a static-type document → register row', async () => {
    const reg = getRegistry().informationRegister['inventory.product_price'];
    if (!reg) throw new Error('inventory.product_price register not registered');

    const config = getRegistry().document['inventory.price_setting'];
    if (!config) throw new Error('inventory.price_setting config not registered');

    const ctx = ctxFor();
    const created = await createDocument(ctx, config, {
      date: new Date('2026-04-25'),
      priceType: TYPE_RETAIL,
      lines: { items: [{ product: PRODUCT, price: 199.99 }] },
    });
    const docId = created.id as string;
    await postDocument(ctx, config, docId);

    await withTenant(TENANT, async (tx) => {
      const row = await informationRegisterAt(
        tx,
        reg,
        { product: PRODUCT, priceType: TYPE_RETAIL },
        new Date('2026-04-25'),
      );
      expect(Number(row?.price)).toBe(199.99);
      expect(row?.docRef).toBe(docId);
    });
  });

  it('rejects post when priceType.kind === "dynamic"', async () => {
    const config = getRegistry().document['inventory.price_setting'];
    if (!config) throw new Error('inventory.price_setting config not registered');

    const ctx = ctxFor();
    const created = await createDocument(ctx, config, {
      date: new Date('2026-04-25'),
      priceType: TYPE_VIP,
      lines: { items: [{ product: PRODUCT, price: 200 }] },
    });
    await expect(postDocument(ctx, config, created.id as string)).rejects.toThrow(
      /dynamic price type/i,
    );
  });

  it('unposting soft-deletes the register rows', async () => {
    const reg = getRegistry().informationRegister['inventory.product_price'];
    if (!reg) throw new Error('inventory.product_price register not registered');

    const config = getRegistry().document['inventory.price_setting'];
    if (!config) throw new Error('inventory.price_setting config not registered');

    const ctx = ctxFor();
    const created = await createDocument(ctx, config, {
      date: new Date('2026-04-25'),
      priceType: TYPE_RETAIL,
      lines: { items: [{ product: PRODUCT, price: 50 }] },
    });
    const docId = created.id as string;
    await postDocument(ctx, config, docId);
    await unpostDocument(ctx, config, docId);

    await withTenant(TENANT, async (tx) => {
      const row = await informationRegisterAt(
        tx,
        reg,
        { product: PRODUCT, priceType: TYPE_RETAIL },
        new Date('2026-04-25'),
      );
      expect(row).toBeNull();
    });
  });
});
