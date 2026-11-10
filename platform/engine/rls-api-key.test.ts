import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tenantA = randomUUID();
const tenantB = randomUUID();
const userA = randomUUID();
const apiKeyAId = randomUUID();

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.user.create({
      data: {
        id: userA,
        clerkId: `user_${userA}`,
        email: `rls-api-key-${userA.slice(0, 8)}@example.test`,
      },
    });
    await tx.tenant.create({
      data: {
        id: tenantA,
        clerkOrgId: `org_${tenantA}`,
        name: 'RLS ApiKey A',
        slug: `rls-api-key-a-${tenantA.slice(0, 8)}`,
        currency: 'USD',
      },
    });
    await tx.tenant.create({
      data: {
        id: tenantB,
        clerkOrgId: `org_${tenantB}`,
        name: 'RLS ApiKey B',
        slug: `rls-api-key-b-${tenantB.slice(0, 8)}`,
        currency: 'EUR',
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.apiKey.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await tx.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await tx.user.delete({ where: { id: userA } });
  });
  await prisma.$disconnect();
});

describe('RLS — api_key isolation', () => {
  it('tenant B cannot see tenant A keys', async () => {
    // Create a key for tenant A inside tenant-A's RLS session
    await withTenant(tenantA, (tx) =>
      tx.apiKey.create({
        data: {
          id: apiKeyAId,
          tenantId: tenantA,
          name: 'rls-test-key',
          keyPrefix: `1ca_live_${tenantA.slice(0, 7)}`,
          keyHash: `$2b$10$${'x'.repeat(53)}`,
          scope: 'read',
          createdById: userA,
        },
      }),
    );

    // Tenant B session sees zero rows
    const underB = await withTenant(tenantB, (tx) => tx.apiKey.findMany());
    expect(underB.length).toBe(0);

    // Tenant A session sees exactly one
    const underA = await withTenant(tenantA, (tx) => tx.apiKey.findMany());
    expect(underA.length).toBe(1);
    expect(underA[0]?.id).toBe(apiKeyAId);
  });

  it('tenant B cannot update tenant A keys', async () => {
    // updateMany under tenant B's session must affect zero rows
    const result = await withTenant(tenantB, (tx) =>
      tx.apiKey.updateMany({
        where: { id: apiKeyAId },
        data: { revokedAt: new Date() },
      }),
    );
    expect(result.count).toBe(0);

    // Verify under bypass that the row was NOT revoked
    const row = await withBypass((tx) => tx.apiKey.findUnique({ where: { id: apiKeyAId } }));
    expect(row?.revokedAt).toBeNull();
  });

  it('tenant B cannot delete tenant A keys', async () => {
    const result = await withTenant(tenantB, (tx) =>
      tx.apiKey.deleteMany({ where: { id: apiKeyAId } }),
    );
    expect(result.count).toBe(0);

    // Row still exists
    const row = await withBypass((tx) => tx.apiKey.findUnique({ where: { id: apiKeyAId } }));
    expect(row).not.toBeNull();
  });

  it('tenant A INSERT with mismatched tenantId is rejected by WITH CHECK', async () => {
    // Attempting to write a row with tenantId = tenantB while inside tenant A's
    // session should be rejected by the RLS WITH CHECK clause.
    await expect(
      withTenant(tenantA, (tx) =>
        tx.apiKey.create({
          data: {
            id: randomUUID(),
            tenantId: tenantB,
            name: 'spoof',
            keyPrefix: `1ca_live_${randomUUID().slice(0, 7)}`,
            keyHash: `$2b$10$${'y'.repeat(53)}`,
            scope: 'read',
            createdById: userA,
          },
        }),
      ),
    ).rejects.toThrow();
  });
});
