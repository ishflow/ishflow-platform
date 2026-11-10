import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import type Stripe from 'stripe';
import { afterEach, describe, expect, it } from 'vitest';
import { handlePaymentFailed } from './payment-failed';

const TEST_SLUG_PREFIX = 't-pay-failed-';

async function makeTenant(stripeCustomerId: string): Promise<string> {
  const t = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_${randomUUID().replace(/-/g, '')}`,
        name: 'pay-failed fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
        plan: 'pro',
        status: 'active',
        stripeCustomerId,
      },
      select: { id: true },
    }),
  );
  return t.id;
}

function makeEvent(customerId: string | null): Stripe.Event {
  return {
    id: `evt_test_pf_${randomUUID().replace(/-/g, '')}`,
    object: 'event',
    type: 'invoice.payment_failed',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'in_test',
        object: 'invoice',
        customer: customerId,
        status: 'open',
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

describe('handlePaymentFailed', () => {
  it('sets tenant.status = past_due', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant(customerId);

    const result = await handlePaymentFailed(makeEvent(customerId));

    expect(result.tenantId).toBe(tenantId);
    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.status).toBe('past_due');
    expect(fresh?.plan).toBe('pro'); // plan untouched
  });

  it('returns null when no tenant matches', async () => {
    const result = await handlePaymentFailed(makeEvent('cus_unknown_pf'));
    expect(result.tenantId).toBeNull();
  });
});
