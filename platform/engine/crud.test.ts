import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/product-price';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { getRegistry } from '@/platform/metadata';
import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  restoreRecord,
  updateRecord,
} from './crud';
import { NotFoundError, PermissionDeniedError, ReferentialError } from './errors';

const tenantId = randomUUID();
const adminCtx = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantId } as never,
  membership: { roles: ['admin'] } as never,
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;

const viewerCtx = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantId } as never,
  membership: { roles: ['viewer'] } as never,
  permissions: new Set<string>(['*:read']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;

const bookkeeperCtx = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantId } as never,
  membership: { roles: ['bookkeeper'] } as never,
  permissions: new Set<string>(['*:read', '*:write', '*:post', '*:unpost']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;

const config = getRegistry().catalog['sales.customer'];
if (!config) throw new Error('sales.customer config not registered');

beforeAll(async () => {
  await withBypass((tx) =>
    tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'CRUD test',
        slug: `crud-${tenantId.slice(0, 8)}`,
      },
    }),
  );
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_sales_customer WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.tenant.delete({ where: { id: tenantId } });
  });
  await prisma.$disconnect();
});

describe('crud — catalog_sales_customer', () => {
  it('starts empty then reflects a created record', async () => {
    const beforeRows = await listRecords(adminCtx, config);
    const beforeCount = beforeRows.length;
    const created = await createRecord(adminCtx, config, { name: `Acme-${randomUUID()}` });
    expect(created.name).toContain('Acme-');
    const all = await listRecords(adminCtx, config);
    expect(all.length).toBe(beforeCount + 1);
  });

  it('updateRecord persists changes', async () => {
    const created = await createRecord(adminCtx, config, {
      name: `ToUpdate-${randomUUID()}`,
    });
    const updated = await updateRecord(adminCtx, config, created.id as string, {
      name: 'Updated Name',
      phone: '+900001',
    });
    expect(updated.name).toBe('Updated Name');
    expect(updated.phone).toBe('+900001');
  });

  it('getRecord returns a record and throws NotFoundError for missing id', async () => {
    const created = await createRecord(adminCtx, config, {
      name: `ToGet-${randomUUID()}`,
    });
    const fetched = await getRecord(adminCtx, config, created.id as string);
    expect(fetched.name).toBe(created.name);

    await expect(getRecord(adminCtx, config, randomUUID())).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deleteRecord soft-deletes and hides from listRecords', async () => {
    const uniqueName = `ToDelete-${randomUUID()}`;
    const created = await createRecord(adminCtx, config, { name: uniqueName });
    await deleteRecord(adminCtx, config, created.id as string);
    const all = await listRecords(adminCtx, config);
    expect(all.some((r) => r.name === uniqueName)).toBe(false);
  });

  it('restoreRecord un-archives a soft-deleted record', async () => {
    const uniqueName = `ToRestore-${randomUUID()}`;
    const created = await createRecord(adminCtx, config, { name: uniqueName });
    await deleteRecord(adminCtx, config, created.id as string);
    expect((await listRecords(adminCtx, config)).some((r) => r.name === uniqueName)).toBe(false);
    await restoreRecord(adminCtx, config, created.id as string);
    expect((await listRecords(adminCtx, config)).some((r) => r.name === uniqueName)).toBe(true);
  });

  it('createRecord denies viewer role', async () => {
    await expect(createRecord(viewerCtx, config, { name: 'Forbidden' })).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
  });

  it('deleteRecord denies bookkeeper role (delete restricted to admin)', async () => {
    const created = await createRecord(adminCtx, config, {
      name: `BookkeeperCannotDelete-${randomUUID()}`,
    });
    await expect(deleteRecord(bookkeeperCtx, config, created.id as string)).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
  });

  it('updateRecord allows bookkeeper role (write permission)', async () => {
    const created = await createRecord(adminCtx, config, {
      name: `BookkeeperCanUpdate-${randomUUID()}`,
    });
    const updated = await updateRecord(bookkeeperCtx, config, created.id as string, {
      name: 'Bookkeeper Edited',
    });
    expect(updated.name).toBe('Bookkeeper Edited');
  });
});

describe('crud — autoGenerate sequence (inventory.product)', () => {
  const productTenantId = randomUUID();
  const productCtx = {
    user: { id: randomUUID() } as never,
    tenant: { id: productTenantId } as never,
    membership: { roles: ['admin'] } as never,
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map<string, unknown>(),
    addons: new Set(),
  } as never;

  const productConfig = getRegistry().catalog['inventory.product'];
  if (!productConfig) throw new Error('inventory.product config not registered');

  beforeAll(async () => {
    await withBypass((tx) =>
      tx.tenant.create({
        data: {
          id: productTenantId,
          clerkOrgId: `org_${productTenantId}`,
          name: 'Product AutoGen test',
          slug: `prod-${productTenantId.slice(0, 8)}`,
        },
      }),
    );
  });

  afterAll(async () => {
    await withBypass(async (tx) => {
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_inventory_product WHERE tenant_id = $1::uuid',
        productTenantId,
      );
      await tx.tenant.delete({ where: { id: productTenantId } });
    });
  });

  it('auto-generates an 8-char uppercase hex code when code is omitted', async () => {
    const created = await createRecord(productCtx, productConfig, {
      name: `AutoCodeProduct-${randomUUID()}`,
    });
    expect(typeof created.code).toBe('string');
    expect(created.code).toMatch(/^[0-9A-F]{8}$/);
  });

  it('preserves an explicitly provided code and does not overwrite it', async () => {
    const created = await createRecord(productCtx, productConfig, {
      name: `ExplicitCodeProduct-${randomUUID()}`,
      code: 'MYCODE01',
    });
    expect(created.code).toBe('MYCODE01');
  });
});

describe('crud — referential guard (archive blocked by stock)', () => {
  const whTenantId = randomUUID();
  const whCtx = {
    user: { id: randomUUID() } as never,
    tenant: { id: whTenantId } as never,
    membership: { roles: ['admin'] } as never,
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map<string, unknown>(),
    addons: new Set(),
  } as never;
  const whConfig = getRegistry().catalog['inventory.warehouse'];
  if (!whConfig) throw new Error('inventory.warehouse config not registered');

  beforeAll(async () => {
    await withBypass((tx) =>
      tx.tenant.create({
        data: {
          id: whTenantId,
          clerkOrgId: `org_${whTenantId}`,
          name: 'Referential test',
          slug: `ref-${whTenantId.slice(0, 8)}`,
        },
      }),
    );
  });

  afterAll(async () => {
    await withBypass(async (tx) => {
      await tx.$executeRawUnsafe(
        'DELETE FROM movement_inventory_stock_balance WHERE tenant_id = $1::uuid',
        whTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_inventory_warehouse WHERE tenant_id = $1::uuid',
        whTenantId,
      );
      await tx.tenant.delete({ where: { id: whTenantId } });
    });
  });

  it('blocks archiving a warehouse that still holds stock', async () => {
    const wh = (await createRecord(whCtx, whConfig, {
      name: `WH-stock-${randomUUID().slice(0, 8)}`,
    })) as { id: string };
    await withBypass((tx) =>
      tx.movement_inventory_stock_balance.create({
        data: {
          tenantId: whTenantId,
          docRef: randomUUID(),
          docType: 'test.receipt',
          kind: 'income',
          active: true,
          timestamp: new Date(),
          warehouse: wh.id,
          product: randomUUID(),
          quantity: 10,
          totalCost: 500,
        },
      }),
    );
    await expect(deleteRecord(whCtx, whConfig, wh.id)).rejects.toBeInstanceOf(ReferentialError);
  });

  it('allows archiving a warehouse with no stock', async () => {
    const wh = (await createRecord(whCtx, whConfig, {
      name: `WH-empty-${randomUUID().slice(0, 8)}`,
    })) as { id: string };
    await expect(deleteRecord(whCtx, whConfig, wh.id)).resolves.toBeUndefined();
  });
});

describe('markupPct fractional storage (sales.price_type)', () => {
  const priceTypeConfig = getRegistry().catalog['sales.price_type'];
  if (!priceTypeConfig) throw new Error('sales.price_type config not registered');

  it('persists a fractional markupPct (0.1) without truncation', async () => {
    const base = (await createRecord(adminCtx, priceTypeConfig, {
      name: `Base-${randomUUID().slice(0, 6)}`,
      kind: 'static',
    })) as { id: string };

    const created = (await createRecord(adminCtx, priceTypeConfig, {
      name: `Dyn-${randomUUID().slice(0, 6)}`,
      kind: 'dynamic',
      basePriceType: base.id,
      markupPct: 0.1,
    })) as { id: string; markupPct: unknown };

    const fetched = (await getRecord(adminCtx, priceTypeConfig, created.id)) as {
      markupPct: unknown;
    };

    expect(Number(fetched.markupPct)).toBeCloseTo(0.1, 4);

    await withBypass(async (tx) => {
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_sales_price_type WHERE tenant_id = $1::uuid',
        tenantId,
      );
    });
  });
});
