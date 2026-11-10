import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import type Stripe from 'stripe';
import { afterEach, describe, expect, it } from 'vitest';
import { handleCheckoutCompleted } from './checkout-completed';

const TEST_SLUG_PREFIX = 't-co-completed-';

async function makeTenant(opts: { stripeCustomerId?: string | null } = {}): Promise<string> {
  const t = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_${randomUUID().replace(/-/g, '')}`,
        name: 'checkout-completed fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
        plan: 'free',
        stripeCustomerId: opts.stripeCustomerId ?? null,
      },
      select: { id: true },
    }),
  );
  return t.id;
}

function makeEvent(overrides: {
  tenantId?: string | null;
  customerId?: string | null;
}): Stripe.Event {
  return {
    id: `evt_test_co_${randomUUID().replace(/-/g, '')}`,
    object: 'event',
    type: 'checkout.session.completed',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'cs_test',
        object: 'checkout.session',
        customer: overrides.customerId ?? null,
        metadata: overrides.tenantId ? { tenantId: overrides.tenantId } : {},
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

describe('handleCheckoutCompleted', () => {
  it('resolves tenant via metadata.tenantId and stores stripeCustomerId', async () => {
    const tenantId = await makeTenant();
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;

    const result = await handleCheckoutCompleted(makeEvent({ tenantId, customerId }));

    expect(result.tenantId).toBe(tenantId);
    const fresh = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(fresh?.stripeCustomerId).toBe(customerId);
  });

  it('resolves tenant by stripeCustomerId when metadata is absent', async () => {
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const tenantId = await makeTenant({ stripeCustomerId: customerId });

    const result = await handleCheckoutCompleted(makeEvent({ tenantId: null, customerId }));

    expect(result.tenantId).toBe(tenantId);
  });

  it('returns null tenantId when no resolution path matches', async () => {
    const result = await handleCheckoutCompleted(
      makeEvent({ tenantId: null, customerId: 'cus_does_not_exist_anywhere' }),
    );
    expect(result.tenantId).toBeNull();
  });

  it("does not modify plan/status — that is subscription.created's job", async () => {
    const tenantId = await makeTenant();
    const customerId = `cus_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const before = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));

    await handleCheckoutCompleted(makeEvent({ tenantId, customerId }));

    const after = await withBypass((tx) => tx.tenant.findUnique({ where: { id: tenantId } }));
    expect(after?.plan).toBe(before?.plan);
    expect(after?.status).toBe(before?.status);
  });
});
