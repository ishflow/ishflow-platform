import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import type Stripe from 'stripe';
import { afterEach, describe, expect, it } from 'vitest';
import { handleTrialWillEnd } from './trial-will-end';

const TEST_SLUG_PREFIX = 't-trial-end-';

async function makeTenant(stripeCustomerId: string): Promise<string> {
  const t = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_${randomUUID().replace(/-/g, '')}`,
        name: 'trial-end fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
        plan: 'pro',
        status: 'trialing',
        stripeCustomerId,
        trialEndsAt: new Date(Date.now() + 3 * 86_400_000),
      },
      select: { id: true },
    }),
  );
  return t.id;
}

function makeEvent(customerId: string | null): Stripe.Event {
  return {
    id: `evt_test_twe_${randomUUID().replace(/-/g, '')}`,
    object: 'event',
    type: 'customer.subscription.trial_will_end',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'sub_trialing',
        object: 'subscription',
        customer: customerId,
        status: 'trialing',
        trial_end: Math.floor(Date.now() / 1000) + 3 * 86_400,
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  } as unknown as Stripe.Event;
}

afterEach(async () => {
  await withBypass((tx) =>
    tx.tenant.deleteMany({ where: { slug: { startsWith: TEST_SLUG_PREFIX } } }),
  );
});

describe('handleTrialWillEnd', () => {
  it('resolves the tenant but does not mutate plan/status/trialEndsAt', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId);
    const before = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));

    const result = await handleTrialWillEnd(makeEvent(customerId));

    expect(result.tenantId).toBe(tenantId);
    const after = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(after?.plan).toBe(before?.plan);
    expect(after?.status).toBe(before?.status);
    expect(after?.trialEndsAt?.getTime()).toBe(before?.trialEndsAt?.getTime());
  });

  it('returns null when no tenant matches', async () => {
    const result = await handleTrialWillEnd(makeEvent('cus_unknown_twe'));
    expect(result.tenantId).toBeNull();
  });
});
