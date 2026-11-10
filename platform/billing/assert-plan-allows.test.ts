import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import { PlanLimitError } from '@/platform/engine/errors';
import { afterEach, describe, expect, it } from 'vitest';

import { assertPlanAllows } from './assert-plan-allows';
import { PLAN_LIMITS } from './plans';

const TEST_SLUG_PREFIX = 't-assert-';
const TEST_EMAIL_DOMAIN = '@assert.ishflow';

async function makeTenant(plan: 'free' | 'pro' = 'free'): Promise<string> {
  const tenant = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_${randomUUID().replace(/-/g, '')}`,
        name: 'assert fixture',
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
        email: `${randomUUID().slice(0, 12)}${TEST_EMAIL_DOMAIN}`,
      },
      select: { id: true },
    }),
  );
  return u.id;
}

async function attachMembership(tenantId: string, userId: string): Promise<void> {
  await withBypass((tx) => tx.membership.create({ data: { tenantId, userId } }));
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
      await tx.membership.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    });
  }
  await withBypass((tx) =>
    tx.user.deleteMany({ where: { email: { contains: TEST_EMAIL_DOMAIN } } }),
  );
});

describe('assertPlanAllows', () => {
  it('throws PlanLimitError when add_member would exceed the free member ceiling', async () => {
    const id = await makeTenant('free');
    const cap = PLAN_LIMITS.free.members;
    // Fill to cap
    for (let i = 0; i < cap; i++) {
      const u = await makeUser();
      await attachMembership(id, u);
    }

    let caught: unknown;
    try {
      await assertPlanAllows(
        { id, plan: 'free', status: 'active', trialEndsAt: null },
        { kind: 'add_member' },
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(PlanLimitError);
    const err = caught as PlanLimitError;
    expect(err.kind).toBe('members');
    expect(err.current).toBe(cap);
    expect(err.allowed).toBe(cap);
    expect(err.upgradeTo).toBe('starter');
    expect(err.toJSON()).toEqual({
      error: 'plan_limit_exceeded',
      kind: 'members',
      current: cap,
      allowed: cap,
      upgradeTo: 'starter',
    });
  });

  it('throws when a free tenant requests a feature gated to pro+', async () => {
    const id = await makeTenant('free');

    await expect(
      assertPlanAllows(
        { id, plan: 'free', status: 'active', trialEndsAt: null },
        { kind: 'feature', feature: 'advancedReports' },
      ),
    ).rejects.toMatchObject({
      name: 'PlanLimitError',
      kind: 'advanced_reports',
      upgradeTo: 'pro',
    });
  });

  it('resolves when a pro tenant requests an advanced-reports feature', async () => {
    const id = await makeTenant('pro');

    await expect(
      assertPlanAllows(
        { id, plan: 'pro', status: 'active', trialEndsAt: null },
        { kind: 'feature', feature: 'advancedReports' },
      ),
    ).resolves.toBeUndefined();
  });

  it('allows past base limit when an unexpired override raises the ceiling', async () => {
    const id = await makeTenant('free');
    const cap = PLAN_LIMITS.free.members;
    const overrider = await makeUser();
    for (let i = 0; i < cap; i++) {
      const u = await makeUser();
      await attachMembership(id, u);
    }
    await withBypass((tx) =>
      tx.planLimitOverride.create({
        data: { tenantId: id, key: 'members', value: cap + 5, createdBy: overrider },
      }),
    );

    await expect(
      assertPlanAllows(
        { id, plan: 'free', status: 'active', trialEndsAt: null },
        { kind: 'add_member' },
      ),
    ).resolves.toBeUndefined();
  });

  it('grandfather: free tenant already above member cap keeps members but blocks add_member', async () => {
    const id = await makeTenant('free');
    const cap = PLAN_LIMITS.free.members; // 2
    // Simulate a post-downgrade tenant carrying more members than the new (lower) cap.
    for (let i = 0; i < cap + 1; i++) {
      const u = await makeUser();
      await attachMembership(id, u);
    }
    // Existing memberships are preserved — the limit check never deletes data...
    const before = await withBypass((tx) => tx.membership.count({ where: { tenantId: id } }));
    expect(before).toBe(cap + 1);
    // ...but a new add is blocked while over the ceiling.
    await expect(
      assertPlanAllows(
        { id, plan: 'free', status: 'active', trialEndsAt: null },
        { kind: 'add_member' },
      ),
    ).rejects.toBeInstanceOf(PlanLimitError);
  });

  it('allows a trialing tenant on plan=free to add a 5th member (pro ceiling applies)', async () => {
    const id = await makeTenant('free');
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    // Free cap is 2; pro cap is 15. Seed 4 memberships so a 5th would exceed
    // the free ceiling but stay well below the pro ceiling.
    for (let i = 0; i < 4; i++) {
      const u = await makeUser();
      await attachMembership(id, u);
    }

    await expect(
      assertPlanAllows(
        { id, plan: 'free', status: 'trialing', trialEndsAt: future },
        { kind: 'add_member' },
      ),
    ).resolves.toBeUndefined();
  });
});
