import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import { afterEach, describe, expect, it } from 'vitest';

import { effectiveLimits } from './effective-limits';
import { PLAN_LIMITS } from './plans';

const TEST_SLUG_PREFIX = 't-eff-lim-';

async function makeTenant(plan: 'free' | 'starter' | 'pro' = 'free'): Promise<string> {
  const tenant = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_${randomUUID().replace(/-/g, '')}`,
        name: 'eff-lim fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
        plan,
      },
      select: { id: true },
    }),
  );
  return tenant.id;
}

async function makeUser(): Promise<string> {
  const u = await withBypass((tx) =>
    tx.user.create({
      data: {
        clerkId: `user_${randomUUID().replace(/-/g, '')}`,
        email: `${randomUUID().slice(0, 12)}@eff-lim.ishflow`,
      },
      select: { id: true },
    }),
  );
  return u.id;
}

afterEach(async () => {
  const tenantIds = (
    await withBypass((tx) =>
      tx.tenant.findMany({
        where: { slug: { startsWith: TEST_SLUG_PREFIX } },
        select: { id: true },
      }),
    )
  ).map((t) => t.id);
  if (tenantIds.length > 0) {
    await withBypass(async (tx) => {
      await tx.planLimitOverride.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    });
  }
  await withBypass((tx) =>
    tx.user.deleteMany({ where: { email: { contains: '@eff-lim.ishflow' } } }),
  );
});

describe('effectiveLimits', () => {
  it('returns PLAN_LIMITS[plan] when no overrides exist', async () => {
    const id = await makeTenant('free');

    const limits = await effectiveLimits({ id, plan: 'free', status: 'active', trialEndsAt: null });

    expect(limits).toEqual(PLAN_LIMITS.free);
  });

  it('raises the ceiling when an unexpired override is present', async () => {
    const id = await makeTenant('free');
    const userId = await makeUser();
    const raised = PLAN_LIMITS.free.members + 10;
    await withBypass((tx) =>
      tx.planLimitOverride.create({
        data: { tenantId: id, key: 'members', value: raised, createdBy: userId },
      }),
    );

    const limits = await effectiveLimits({ id, plan: 'free', status: 'active', trialEndsAt: null });

    expect(limits.members).toBe(raised);
    expect(limits.monthlyPostedDocs).toBe(PLAN_LIMITS.free.monthlyPostedDocs);
  });

  it('returns PLAN_LIMITS.pro for a trialing tenant on plan=free with future trialEndsAt', async () => {
    const id = await makeTenant('free');
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const limits = await effectiveLimits({
      id,
      plan: 'free',
      status: 'trialing',
      trialEndsAt: future,
    });

    expect(limits).toEqual(PLAN_LIMITS.pro);
  });

  it('ignores expired overrides', async () => {
    const id = await makeTenant('free');
    const userId = await makeUser();
    await withBypass((tx) =>
      tx.planLimitOverride.create({
        data: {
          tenantId: id,
          key: 'members',
          value: 999,
          expiresAt: new Date(Date.now() - 60_000),
          createdBy: userId,
        },
      }),
    );

    const limits = await effectiveLimits({ id, plan: 'free', status: 'active', trialEndsAt: null });

    expect(limits.members).toBe(PLAN_LIMITS.free.members);
  });
});
