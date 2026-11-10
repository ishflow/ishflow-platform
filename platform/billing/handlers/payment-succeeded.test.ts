import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import type Stripe from 'stripe';
import { afterEach, describe, expect, it } from 'vitest';
import { handlePaymentSucceeded } from './payment-succeeded';

const TEST_SLUG_PREFIX = 't-pay-succ-';

async function makeTenant(
  stripeCustomerId: string,
  status: 'active' | 'past_due' | 'trialing',
): Promise<string> {
  const t = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_${randomUUID().replace(/-/g, '')}`,
        name: 'pay-succ fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
        plan: 'pro',
        status,
        stripeCustomerId,
      },
      select: { id: true },
    }),
  );
  return t.id;
}

function makeEvent(customerId: string | null): Stripe.Event {
  return {
    id: `evt_test_ps_${randomUUID().replace(/-/g, '')}`,
    object: 'event',
    type: 'invoice.payment_succeeded',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'in_paid',
        object: 'invoice',
        customer: customerId,
        status: 'paid',
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

describe('handlePaymentSucceeded', () => {
  it('recovers past_due → active', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId, 'past_due');

    await handlePaymentSucceeded(makeEvent(customerId));

    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.status).toBe('active');
  });

  it('leaves active tenants untouched', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId, 'active');

    await handlePaymentSucceeded(makeEvent(customerId));

    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.status).toBe('active');
  });

  it('leaves trialing tenants untouched (renewal during trial extension is rare but valid)', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId, 'trialing');

    await handlePaymentSucceeded(makeEvent(customerId));

    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.status).toBe('trialing');
  });

  it('returns null when no tenant matches', async () => {
    const result = await handlePaymentSucceeded(makeEvent('cus_unknown_ps'));
    expect(result.tenantId).toBeNull();
  });
});
