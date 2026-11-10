import type { Tenant } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const billingPortalCreate = vi.hoisted(() => vi.fn());

vi.mock('./stripe-client', () => ({
  stripe: () => ({
    billingPortal: {
      sessions: {
        create: billingPortalCreate,
      },
    },
  }),
}));

import { createPortalSession } from './create-portal';

function tenantFixture(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 't-1',
    clerkOrgId: 'org_1',
    name: 'Test',
    slug: 'test',
    plan: 'free',
    status: 'trialing',
    currency: 'USD',
    defaultLocale: 'ru',
    defaultMarkupPct: '0.10' as unknown as Tenant['defaultMarkupPct'],
    mobileFeatures: null,
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: null,
    legalName: null,
    logoUrl: null,
    brandColor: null,
    archivedBy: null,
    trialEndsAt: null,
    demoImportedAt: null,
    onboardingState: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Tenant;
}

beforeEach(() => {
  billingPortalCreate.mockReset();
});

afterEach(() => {
  billingPortalCreate.mockReset();
});

describe('createPortalSession', () => {
  it('throws when tenant has no stripeCustomerId', async () => {
    await expect(
      createPortalSession({
        tenant: tenantFixture({ stripeCustomerId: null }),
        returnUrl: 'http://localhost/admin/billing',
      }),
    ).rejects.toThrow(/no Stripe customer/i);
    expect(billingPortalCreate).not.toHaveBeenCalled();
  });

  it('creates a billing portal session and returns the url', async () => {
    billingPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/p/session/test' });
    const result = await createPortalSession({
      tenant: tenantFixture({ stripeCustomerId: 'cus_abc' }),
      returnUrl: 'http://localhost/admin/billing',
    });
    expect(billingPortalCreate).toHaveBeenCalledWith({
      customer: 'cus_abc',
      return_url: 'http://localhost/admin/billing',
    });
    expect(result).toEqual({ url: 'https://billing.stripe.com/p/session/test' });
  });
});
