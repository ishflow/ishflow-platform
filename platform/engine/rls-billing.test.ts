import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tenantA = randomUUID();
const tenantB = randomUUID();
const userA = randomUUID();

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.user.create({
      data: {
        id: userA,
        clerkId: `user_${userA}`,
        email: `rls-billing-${userA.slice(0, 8)}@example.test`,
      },
    });
    await tx.tenant.create({
      data: {
        id: tenantA,
        clerkOrgId: `org_${tenantA}`,
        name: 'RLS Billing A',
        slug: `rls-billing-a-${tenantA.slice(0, 8)}`,
        currency: 'USD',
      },
    });
    await tx.tenant.create({
      data: {
        id: tenantB,
        clerkOrgId: `org_${tenantB}`,
        name: 'RLS Billing B',
        slug: `rls-billing-b-${tenantB.slice(0, 8)}`,
        currency: 'EUR',
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.planLimitOverride.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await tx.billingEvent.deleteMany({
      where: {
        OR: [
          { tenantId: { in: [tenantA, tenantB] } },
          { stripeEventId: { startsWith: 'evt_rls_' } },
        ],
      },
    });
    await tx.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await tx.user.delete({ where: { id: userA } });
  });
  await prisma.$disconnect();
});

describe('RLS — plan_limit_override isolation', () => {
  it('tenant B cannot see tenant A overrides', async () => {
    await withTenant(tenantA, (tx) =>
      tx.planLimitOverride.create({
        data: {
          tenantId: tenantA,
          key: 'users.max',
          value: 50,
          createdBy: userA,
        },
      }),
    );

    const underB = await withTenant(tenantB, (tx) => tx.planLimitOverride.findMany());
    expect(underB.length).toBe(0);

    const underA = await withTenant(tenantA, (tx) => tx.planLimitOverride.findMany());
    expect(underA.length).toBe(1);
    expect(underA[0]?.key).toBe('users.max');
  });
});

describe('RLS — billing_event isolation', () => {
  it('tenant B cannot see tenant A events', async () => {
    await withBypass((tx) =>
      tx.billingEvent.create({
        data: {
          tenantId: tenantA,
          stripeEventId: `evt_rls_${tenantA.slice(0, 8)}`,
          type: 'customer.subscription.created',
          payload: { ok: true },
        },
      }),
    );

    const underB = await withTenant(tenantB, (tx) => tx.billingEvent.findMany());
    expect(underB.length).toBe(0);

    const underA = await withTenant(tenantA, (tx) => tx.billingEvent.findMany());
    expect(underA.length).toBe(1);
    expect(underA[0]?.type).toBe('customer.subscription.created');
  });

  it('null-tenant events are invisible to tenant-scoped sessions and visible only via bypass', async () => {
    const stripeEventId = `evt_rls_null_${randomUUID().slice(0, 8)}`;
    await withBypass((tx) =>
      tx.billingEvent.create({
        data: {
          tenantId: null,
          stripeEventId,
          type: 'invoice.payment_succeeded',
          payload: { ok: true },
        },
      }),
    );

    const underA = await withTenant(tenantA, (tx) =>
      tx.billingEvent.findMany({ where: { stripeEventId } }),
    );
    expect(underA.length).toBe(0);

    const underB = await withTenant(tenantB, (tx) =>
      tx.billingEvent.findMany({ where: { stripeEventId } }),
    );
    expect(underB.length).toBe(0);

    const viaBypass = await withBypass((tx) =>
      tx.billingEvent.findMany({ where: { stripeEventId } }),
    );
    expect(viaBypass.length).toBe(1);
    expect(viaBypass[0]?.tenantId).toBeNull();
  });
});
