import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tenantA = randomUUID();
const tenantB = randomUUID();
const userA = randomUUID();
const userB = randomUUID();

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.createMany({
      data: [
        {
          id: tenantA,
          clerkOrgId: `org_${tenantA}`,
          name: 'Mobile A',
          slug: `mob-a-${tenantA.slice(0, 8)}`,
        },
        {
          id: tenantB,
          clerkOrgId: `org_${tenantB}`,
          name: 'Mobile B',
          slug: `mob-b-${tenantB.slice(0, 8)}`,
        },
      ],
    });
    await tx.user.createMany({
      data: [
        { id: userA, clerkId: `u_${userA}`, email: `a-${userA}@t.local` },
        { id: userB, clerkId: `u_${userB}`, email: `b-${userB}@t.local` },
      ],
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      `DELETE FROM idempotency_key WHERE tenant_id IN ('${tenantA}', '${tenantB}')`,
    );
    await tx.$executeRawUnsafe(
      `DELETE FROM device_push_token WHERE tenant_id IN ('${tenantA}', '${tenantB}')`,
    );
    await tx.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    await tx.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  });
  await prisma.$disconnect();
});

describe('RLS — idempotency_key isolation', () => {
  it('tenant B cannot see tenant A idempotency keys', async () => {
    const keyA = randomUUID();
    await withTenant(tenantA, (tx) =>
      (
        tx as unknown as {
          idempotencyKey: { create: (a: unknown) => Promise<unknown> };
        }
      ).idempotencyKey.create({
        data: {
          tenantId: tenantA,
          key: keyA,
          resourceType: 'doc',
          resourceId: randomUUID(),
          responseBody: { ok: true },
        },
      }),
    );

    const bRows = await withTenant(tenantB, (tx) =>
      (
        tx as unknown as {
          idempotencyKey: { findMany: (a?: unknown) => Promise<unknown[]> };
        }
      ).idempotencyKey.findMany({ where: { key: keyA } }),
    );
    expect(bRows.length).toBe(0);

    const aRows = await withTenant(tenantA, (tx) =>
      (
        tx as unknown as {
          idempotencyKey: { findMany: (a?: unknown) => Promise<unknown[]> };
        }
      ).idempotencyKey.findMany({ where: { key: keyA } }),
    );
    expect(aRows.length).toBe(1);
  });
});

describe('RLS — device_push_token isolation', () => {
  it('tenant B cannot see tenant A push tokens', async () => {
    const tokenA = `ExponentPushToken[${randomUUID()}]`;
    await withTenant(tenantA, (tx) =>
      (
        tx as unknown as {
          devicePushToken: { create: (a: unknown) => Promise<unknown> };
        }
      ).devicePushToken.create({
        data: { tenantId: tenantA, userId: userA, token: tokenA, platform: 'ios' },
      }),
    );

    const bRows = await withTenant(tenantB, (tx) =>
      (
        tx as unknown as {
          devicePushToken: { findMany: (a?: unknown) => Promise<unknown[]> };
        }
      ).devicePushToken.findMany({ where: { token: tokenA } }),
    );
    expect(bRows.length).toBe(0);
  });
});
