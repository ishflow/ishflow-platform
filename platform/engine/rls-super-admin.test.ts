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
        name: 'RLS SuperAdmin A',
        slug: `rls-super-admin-a-${tenantA.slice(0, 8)}`,
        currency: 'USD',
      },
    });
    await tx.tenant.create({
      data: {
        id: tenantB,
        clerkOrgId: `org_${tenantB}`,
        name: 'RLS SuperAdmin B',
        slug: `rls-super-admin-b-${tenantB.slice(0, 8)}`,
        currency: 'EUR',
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.platformAuditLog.deleteMany({
      where: { tenantId: { in: [tenantA, tenantB] } },
    });
    await tx.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  });
  await prisma.$disconnect();
});

describe('platform_audit_log — global (no RLS) by design', () => {
  it('accepts writes via withBypass and round-trips', async () => {
    const row = await withBypass((tx) =>
      tx.platformAuditLog.create({
        data: {
          actorClerkId: 'user_test_actor',
          action: 'plan.changed',
          tenantId: tenantA,
          before: { plan: 'free' },
          after: { plan: 'pro' },
        },
      }),
    );
    expect(row.id).toBeDefined();

    const read = await withBypass((tx) =>
      tx.platformAuditLog.findUnique({ where: { id: row.id } }),
    );
    expect(read).not.toBeNull();
    expect(read?.actorClerkId).toBe('user_test_actor');
    expect(read?.action).toBe('plan.changed');
    expect(read?.tenantId).toBe(tenantA);
  });

  it('withTenant reads still see all rows — global table has no policy', async () => {
    // Seed two rows, one per tenant
    await withBypass(async (tx) => {
      await tx.platformAuditLog.create({
        data: { actorClerkId: 'a', action: 'plan.changed', tenantId: tenantA },
      });
      await tx.platformAuditLog.create({
        data: { actorClerkId: 'b', action: 'plan.changed', tenantId: tenantB },
      });
    });

    // A tenant-scoped transaction can still read both because the table has
    // no RLS policy — this is intentional. Cross-tenant visibility for
    // operator-internal audit is the whole point of platform_audit_log.
    const fromTenantA = await withTenant(tenantA, (tx) =>
      tx.platformAuditLog.findMany({
        where: { tenantId: { in: [tenantA, tenantB] } },
        select: { tenantId: true },
      }),
    );
    const seen = new Set(fromTenantA.map((r) => r.tenantId));
    expect(seen.has(tenantA)).toBe(true);
    expect(seen.has(tenantB)).toBe(true);
  });
});
