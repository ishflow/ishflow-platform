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
import { handleSubscriptionUpdated } from './subscription-updated';

const TEST_SLUG_PREFIX = 't-sub-updated-';

async function makeTenant(
  stripeCustomerId: string,
  overrides: {
    plan?: 'free' | 'starter' | 'pro' | 'business';
    status?: 'active' | 'trialing' | 'past_due' | 'suspended' | 'cancelled';
  } = {},
): Promise<string> {
  const t = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_${randomUUID().replace(/-/g, '')}`,
        name: 'sub-updated fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
        plan: overrides.plan ?? 'starter',
        status: overrides.status ?? 'active',
        stripeCustomerId,
        stripeSubscriptionId: 'sub_existing',
      },
      select: { id: true },
    }),
  );
  return t.id;
}

function makeEvent(opts: {
  customerId: string;
  status: Stripe.Subscription.Status;
  priceId?: string;
  trialEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
}): Stripe.Event {
  return {
    id: `evt_test_su_${randomUUID().replace(/-/g, '')}`,
    object: 'event',
    type: 'customer.subscription.updated',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'sub_existing',
        object: 'subscription',
        customer: opts.customerId,
        status: opts.status,
        trial_end: opts.trialEnd === undefined ? null : opts.trialEnd,
        cancel_at_period_end: opts.cancelAtPeriodEnd ?? false,
        items: {
          object: 'list',
          data: [
            {
              id: 'si_1',
              object: 'subscription_item',
              price: { id: opts.priceId ?? 'price_pro', object: 'price' },
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

describe('handleSubscriptionUpdated', () => {
  it('upgrades plan when price changes', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId, { plan: 'starter' });
    mockPricesRetrieve.mockResolvedValue({
      id: 'price_business',
      metadata: { plan: 'business' },
    });

    await handleSubscriptionUpdated(
      makeEvent({ customerId, status: 'active', priceId: 'price_business' }),
    );

    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.plan).toBe('business');
    expect(fresh?.status).toBe('active');
  });

  it('maps past_due Stripe status → past_due', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId);
    mockPricesRetrieve.mockResolvedValue({ id: 'price_pro', metadata: { plan: 'pro' } });

    await handleSubscriptionUpdated(makeEvent({ customerId, status: 'past_due' }));

    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.status).toBe('past_due');
  });

  it('keeps status=active when cancel_at_period_end=true', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId);
    mockPricesRetrieve.mockResolvedValue({ id: 'price_pro', metadata: { plan: 'pro' } });

    await handleSubscriptionUpdated(
      makeEvent({ customerId, status: 'active', cancelAtPeriodEnd: true }),
    );

    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.status).toBe('active');
  });

  it('maps incomplete → suspended', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId);
    mockPricesRetrieve.mockResolvedValue({ id: 'price_pro', metadata: { plan: 'pro' } });

    await handleSubscriptionUpdated(makeEvent({ customerId, status: 'incomplete' }));

    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.status).toBe('suspended');
  });

  it('returns null tenantId when customer is unknown', async () => {
    const result = await handleSubscriptionUpdated(
      makeEvent({ customerId: 'cus_nope', status: 'active' }),
    );
    expect(result.tenantId).toBeNull();
  });
});
