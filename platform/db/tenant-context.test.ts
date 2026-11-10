import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './index';
import { withBypass, withTenant } from './tenant-context';

describe('withTenant', () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  beforeAll(async () => {
    await prisma.tenant.createMany({
      data: [
        {
          id: tenantA,
          clerkOrgId: `org_${tenantA}`,
          name: 'Tenant A',
          slug: `a-${tenantA.slice(0, 8)}`,
        },
        {
          id: tenantB,
          clerkOrgId: `org_${tenantB}`,
          name: 'Tenant B',
          slug: `b-${tenantB.slice(0, 8)}`,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma.$disconnect();
  });

  it('sets the tenant_id session variable within the callback', async () => {
    const result = await withTenant(tenantA, async (tx) => {
      const rows = await tx.$queryRaw<{ tenant_id: string }[]>`
        SELECT current_setting('app.tenant_id', true)::text AS tenant_id
      `;
      return rows[0]?.tenant_id;
    });
    expect(result).toBe(tenantA);
  });

  it('restricts audit_log reads to the current tenant via RLS', async () => {
    // Seed via bypass — these inserts intentionally cross tenants.
    await withBypass((tx) =>
      tx.auditLog.createMany({
        data: [
          { tenantId: tenantA, entity: 'Tenant', entityId: tenantA, action: 'rls-test' },
          { tenantId: tenantB, entity: 'Tenant', entityId: tenantB, action: 'rls-test' },
        ],
      }),
    );

    const visibleForA = await withTenant(tenantA, (tx) =>
      tx.auditLog.findMany({ where: { action: 'rls-test' } }),
    );
    expect(visibleForA.length).toBeGreaterThan(0);
    expect(visibleForA.every((r) => r.tenantId === tenantA)).toBe(true);

    const visibleForB = await withTenant(tenantB, (tx) =>
      tx.auditLog.findMany({ where: { action: 'rls-test' } }),
    );
    expect(visibleForB.length).toBeGreaterThan(0);
    expect(visibleForB.every((r) => r.tenantId === tenantB)).toBe(true);

    await withBypass((tx) => tx.auditLog.deleteMany({ where: { action: 'rls-test' } }));
  });

  it('rejects audit_log inserts when no tenant context is set', async () => {
    await expect(
      prisma.auditLog.create({
        data: {
          tenantId: tenantA,
          entity: 'Tenant',
          entityId: tenantA,
          action: 'should-fail',
        },
      }),
    ).rejects.toThrow();
  });

  it('runs under a non-privileged DB role (rolsuper=false, rolbypassrls=false)', async () => {
    // Intentionally uses prisma directly — verifies the pool connection role, not a per-session setting.
    const rows = await prisma.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
      'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
    );
    expect(rows[0]?.rolsuper).toBe(false);
    expect(rows[0]?.rolbypassrls).toBe(false);
  });

  it('returns 0 rows for a made-up tenant UUID on a tenant-scoped table', async () => {
    const madeUp = randomUUID(); // never inserted into the tenant table
    const rows = await withTenant(madeUp, (tx) =>
      tx.catalog_sales_customer.findMany({ select: { id: true } }),
    );
    expect(rows).toEqual([]);
  });

  it('isolates catalog_sales_customer writes between tenants', async () => {
    const nameA = `iso-A-${randomUUID().slice(0, 6)}`;
    const nameB = `iso-B-${randomUUID().slice(0, 6)}`;
    try {
      await withTenant(tenantA, (tx) =>
        tx.catalog_sales_customer.create({
          data: { tenantId: tenantA, code: randomUUID().slice(0, 8).toUpperCase(), name: nameA },
        }),
      );
      await withTenant(tenantB, (tx) =>
        tx.catalog_sales_customer.create({
          data: { tenantId: tenantB, code: randomUUID().slice(0, 8).toUpperCase(), name: nameB },
        }),
      );

      const visibleForA = await withTenant(tenantA, (tx) =>
        tx.catalog_sales_customer.findMany({ where: { name: { in: [nameA, nameB] } } }),
      );
      expect(visibleForA).toHaveLength(1);
      expect(visibleForA[0]?.name).toBe(nameA);

      const visibleForB = await withTenant(tenantB, (tx) =>
        tx.catalog_sales_customer.findMany({ where: { name: { in: [nameA, nameB] } } }),
      );
      expect(visibleForB).toHaveLength(1);
      expect(visibleForB[0]?.name).toBe(nameB);
    } finally {
      await withBypass((tx) =>
        tx.catalog_sales_customer.deleteMany({ where: { name: { in: [nameA, nameB] } } }),
      );
    }
  });
});
