import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import type Stripe from 'stripe';
import { afterEach, describe, expect, it } from 'vitest';
import { handleSubscriptionDeleted } from './subscription-deleted';

const TEST_SLUG_PREFIX = 't-sub-deleted-';

async function makeTenant(stripeCustomerId: string): Promise<string> {
  const t = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_${randomUUID().replace(/-/g, '')}`,
        name: 'sub-deleted fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
        plan: 'pro',
        status: 'active',
        stripeCustomerId,
        stripeSubscriptionId: 'sub_old',
        trialEndsAt: new Date(Date.now() + 86_400_000),
      },
      select: { id: true },
    }),
  );
  return t.id;
}

function makeEvent(customerId: string | null): Stripe.Event {
  return {
    id: `evt_test_sd_${randomUUID().replace(/-/g, '')}`,
    object: 'event',
    type: 'customer.subscription.deleted',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'sub_old',
        object: 'subscription',
        customer: customerId,
        status: 'canceled',
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

describe('handleSubscriptionDeleted', () => {
  it('downgrades plan to free, clears subscription id + trial, sets status=cancelled', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId);

    const result = await handleSubscriptionDeleted(makeEvent(customerId));

    expect(result.tenantId).toBe(tenantId);
    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.plan).toBe('free');
    expect(fresh?.status).toBe('cancelled');
    expect(fresh?.stripeSubscriptionId).toBeNull();
    expect(fresh?.trialEndsAt).toBeNull();
  });

  it('returns null when no tenant matches', async () => {
    const result = await handleSubscriptionDeleted(makeEvent('cus_unknown'));
    expect(result.tenantId).toBeNull();
  });
});
