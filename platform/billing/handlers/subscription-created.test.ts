import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import type Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPricesRetrieve = vi.hoisted(() => vi.fn());

vi.mock('@/platform/billing/stripe-client', () => ({
  stripe: () => ({
    prices: { retrieve: mockPricesRetrieve },
  }),
}));

import { resetPriceCacheForTests } from './_helpers';
import { handleSubscriptionCreated } from './subscription-created';

const TEST_SLUG_PREFIX = 't-sub-created-';

async function makeTenant(stripeCustomerId: string): Promise<string> {
  const t = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_${randomUUID().replace(/-/g, '')}`,
        name: 'sub-created fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
        plan: 'free',
        stripeCustomerId,
      },
      select: { id: true },
    }),
  );
  return t.id;
}

function makeEvent(opts: {
  customerId: string;
  subscriptionId?: string;
  priceId?: string;
  status?: Stripe.Subscription.Status;
  trialEnd?: number | null;
}): Stripe.Event {
  return {
    id: `evt_test_sc_${randomUUID().replace(/-/g, '')}`,
    object: 'event',
    type: 'customer.subscription.created',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: opts.subscriptionId ?? 'sub_test',
        object: 'subscription',
        customer: opts.customerId,
        status: opts.status ?? 'trialing',
        trial_end: opts.trialEnd === undefined ? null : opts.trialEnd,
        items: {
          object: 'list',
          data: [
            {
              id: 'si_1',
              object: 'subscription_item',
              price: { id: opts.priceId ?? 'price_pro_month', object: 'price' },
            },
          ],
        },
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  mockPricesRetrieve.mockReset();
  resetPriceCacheForTests();
});

afterEach(async () => {
  await withBypass((tx) =>
    tx.tenant.deleteMany({ where: { slug: { startsWith: TEST_SLUG_PREFIX } } }),
  );
});

describe('handleSubscriptionCreated', () => {
  it('sets plan/status/trialEndsAt/stripeSubscriptionId on the matching tenant', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId);
    const trialEnd = Math.floor(Date.now() / 1000) + 86_400 * 7;
    mockPricesRetrieve.mockResolvedValue({
      id: 'price_pro_month',
      metadata: { plan: 'pro' },
    });

    const result = await handleSubscriptionCreated(
      makeEvent({
        customerId,
        subscriptionId: 'sub_abc',
        priceId: 'price_pro_month',
        status: 'trialing',
        trialEnd,
      }),
    );

    expect(result.tenantId).toBe(tenantId);
    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.plan).toBe('pro');
    expect(fresh?.status).toBe('trialing');
    expect(fresh?.stripeSubscriptionId).toBe('sub_abc');
    expect(fresh?.trialEndsAt?.getTime()).toBe(trialEnd * 1000);
  });

  it('sets status=active when subscription is not trialing', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId);
    mockPricesRetrieve.mockResolvedValue({
      id: 'price_starter_year',
      metadata: { plan: 'starter' },
    });

    await handleSubscriptionCreated(
      makeEvent({ customerId, priceId: 'price_starter_year', status: 'active', trialEnd: null }),
    );

    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.status).toBe('active');
    expect(fresh?.plan).toBe('starter');
    expect(fresh?.trialEndsAt).toBeNull();
  });

  it('returns null tenantId when no tenant matches the customer', async () => {
    const result = await handleSubscriptionCreated(
      makeEvent({ customerId: 'cus_nobody_owns_this' }),
    );
    expect(result.tenantId).toBeNull();
    expect(mockPricesRetrieve).not.toHaveBeenCalled();
  });

  it('throws when Stripe Price has no metadata.plan', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    await makeTenant(customerId);
    mockPricesRetrieve.mockResolvedValue({ id: 'price_no_meta', metadata: {} });

    await expect(
      handleSubscriptionCreated(makeEvent({ customerId, priceId: 'price_no_meta' })),
    ).rejects.toThrow(/metadata.plan/);
  });
});
