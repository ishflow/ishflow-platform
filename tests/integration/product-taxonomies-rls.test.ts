import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tenantA = randomUUID();
const tenantB = randomUUID();

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
      'DELETE FROM catalog_inventory_product_category WHERE tenant_id IN ($1::uuid, $2::uuid)',
      tenantA,
      tenantB,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_product_group WHERE tenant_id IN ($1::uuid, $2::uuid)',
      tenantA,
      tenantB,
    );
    await tx.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  });
  await prisma.$disconnect();
});

describe('RLS — catalog_inventory_product_category isolation', () => {
  it('tenant B cannot see tenant A product_category rows', async () => {
    const marker = `RLS-CAT-A-${randomUUID()}`;
    await withTenant(tenantA, (tx) =>
      (
        tx as unknown as {
          catalog_inventory_product_category: {
            create: (args: unknown) => Promise<unknown>;
          };
        }
      ).catalog_inventory_product_category.create({
        data: {
          tenantId: tenantA,
          name: marker,
        },
      }),
    );

    const rowsUnderB = await withTenant(tenantB, (tx) =>
      (
        tx as unknown as {
          catalog_inventory_product_category: {
            findMany: (args?: unknown) => Promise<unknown[]>;
          };
        }
      ).catalog_inventory_product_category.findMany({ where: { deletedAt: null } }),
    );
    expect((rowsUnderB as Array<{ name?: string }>).some((r) => r.name === marker)).toBe(false);

    const rowsUnderA = await withTenant(tenantA, (tx) =>
      (
        tx as unknown as {
          catalog_inventory_product_category: {
            findMany: (args?: unknown) => Promise<unknown[]>;
          };
        }
      ).catalog_inventory_product_category.findMany({ where: { deletedAt: null } }),
    );
    expect((rowsUnderA as Array<{ name?: string }>).some((r) => r.name === marker)).toBe(true);
  });
});

describe('RLS — catalog_inventory_product_group isolation', () => {
  it('tenant B cannot see tenant A product_group rows', async () => {
    const marker = `RLS-GRP-A-${randomUUID()}`;
    await withTenant(tenantA, (tx) =>
      (
        tx as unknown as {
          catalog_inventory_product_group: {
            create: (args: unknown) => Promise<unknown>;
          };
        }
      ).catalog_inventory_product_group.create({
        data: {
          tenantId: tenantA,
          name: marker,
        },
      }),
    );

    const rowsUnderB = await withTenant(tenantB, (tx) =>
      (
        tx as unknown as {
          catalog_inventory_product_group: {
            findMany: (args?: unknown) => Promise<unknown[]>;
          };
        }
      ).catalog_inventory_product_group.findMany({ where: { deletedAt: null } }),
    );
    expect((rowsUnderB as Array<{ name?: string }>).some((r) => r.name === marker)).toBe(false);

    const rowsUnderA = await withTenant(tenantA, (tx) =>
      (
        tx as unknown as {
          catalog_inventory_product_group: {
            findMany: (args?: unknown) => Promise<unknown[]>;
          };
        }
      ).catalog_inventory_product_group.findMany({ where: { deletedAt: null } }),
    );
    expect((rowsUnderA as Array<{ name?: string }>).some((r) => r.name === marker)).toBe(true);
  });
});
