import type { Tenant } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCheckoutCreate = vi.hoisted(() => vi.fn());
const mockCustomerCreate = vi.hoisted(() => vi.fn());
const mockStripe = vi.hoisted(() => vi.fn());
const mockWithBypass = vi.hoisted(() => vi.fn());

vi.mock('./stripe-client', () => ({
  stripe: mockStripe,
}));

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

vi.mock('./stripe-prices', () => ({
  STRIPE_PRICES: {
    starter: {
      month: { USD: 'price_starter_month_usd', EUR: '', RUB: '', TRY: '' },
      year: { USD: '', EUR: '', RUB: '', TRY: '' },
    },
    pro: {
      month: { USD: 'price_pro_month_usd', EUR: 'price_pro_month_eur', RUB: '', TRY: '' },
      year: { USD: 'price_pro_year_usd', EUR: '', RUB: '', TRY: '' },
    },
    business: {
      month: { USD: 'price_business_month_usd', EUR: '', RUB: '', TRY: '' },
      year: { USD: '', EUR: '', RUB: '', TRY: '' },
    },
  },
}));

import { createCheckoutSession } from './create-checkout';

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 't1',
    clerkOrgId: 'org_1',
    name: 'Acme',
    slug: 'acme',
    plan: 'free',
    status: 'trialing',
    currency: 'USD',
    defaultLocale: 'ru',
    defaultMarkupPct: '0.1000' as unknown as Tenant['defaultMarkupPct'],
    mobileFeatures: null,
    notificationSettings: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    legalName: null,
    logoUrl: null,
    brandColor: null,
    archivedBy: null,
    trialEndsAt: null,
    demoImportedAt: null,
    onboardingState: null,
    lastActivityAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('createCheckoutSession', () => {
  beforeEach(() => {
    mockCheckoutCreate.mockReset();
    mockCustomerCreate.mockReset();
    mockStripe.mockReset();
    mockWithBypass.mockReset();

    mockStripe.mockReturnValue({
      customers: { create: mockCustomerCreate },
      checkout: { sessions: { create: mockCheckoutCreate } },
    });
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        tenant: {
          update: vi.fn().mockResolvedValue(undefined),
        },
      }),
    );
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/c/sess_123' });
  });

  it('creates a Stripe customer when tenant has no stripeCustomerId', async () => {
    mockCustomerCreate.mockResolvedValue({ id: 'cus_new' });
    const tenant = makeTenant({ stripeCustomerId: null });

    const result = await createCheckoutSession({
      tenant,
      plan: 'pro',
      interval: 'month',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/cancel',
    });

    expect(mockCustomerCreate).toHaveBeenCalledWith({
      metadata: { tenantId: 't1' },
      name: 'Acme',
    });
    expect(mockWithBypass).toHaveBeenCalledTimes(1);
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_new',
        line_items: [{ price: 'price_pro_month_usd', quantity: 1 }],
        success_url: 'https://app/ok',
        cancel_url: 'https://app/cancel',
        allow_promotion_codes: true,
        metadata: { tenantId: 't1' },
      }),
    );
    expect(result.url).toBe('https://checkout.stripe.com/c/sess_123');
  });

  it('reuses existing stripeCustomerId without creating a new customer', async () => {
    const tenant = makeTenant({ stripeCustomerId: 'cus_existing' });

    await createCheckoutSession({
      tenant,
      plan: 'pro',
      interval: 'month',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/cancel',
    });

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(mockWithBypass).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' }),
    );
  });

  it('passes trial_period_days when trialEndsAt is in the future', async () => {
    const trialEndsAt = new Date(Date.now() + 3 * 86_400_000);
    const tenant = makeTenant({ stripeCustomerId: 'cus_x', trialEndsAt });

    await createCheckoutSession({
      tenant,
      plan: 'starter',
      interval: 'month',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/cancel',
    });

    const call = mockCheckoutCreate.mock.calls[0]?.[0];
    expect(call.subscription_data).toBeDefined();
    expect(call.subscription_data.trial_period_days).toBeGreaterThanOrEqual(1);
    expect(call.subscription_data.trial_period_days).toBeLessThanOrEqual(3);
  });

  it('omits subscription_data when trial has expired', async () => {
    const trialEndsAt = new Date(Date.now() - 86_400_000);
    const tenant = makeTenant({ stripeCustomerId: 'cus_x', trialEndsAt });

    await createCheckoutSession({
      tenant,
      plan: 'pro',
      interval: 'year',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/cancel',
    });

    const call = mockCheckoutCreate.mock.calls[0]?.[0];
    expect(call.subscription_data).toBeUndefined();
  });

  it('falls back to USD when tenant currency is unsupported', async () => {
    const tenant = makeTenant({ stripeCustomerId: 'cus_x', currency: 'GBP' });

    await createCheckoutSession({
      tenant,
      plan: 'pro',
      interval: 'month',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/cancel',
    });

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_pro_month_usd', quantity: 1 }],
      }),
    );
  });

  it('uses the EUR-priced item when tenant currency is EUR', async () => {
    const tenant = makeTenant({ stripeCustomerId: 'cus_x', currency: 'EUR' });

    await createCheckoutSession({
      tenant,
      plan: 'pro',
      interval: 'month',
      successUrl: 'https://app/ok',
      cancelUrl: 'https://app/cancel',
    });

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_pro_month_eur', quantity: 1 }],
      }),
    );
  });

  it('throws when no Stripe price is configured for plan/interval/currency', async () => {
    const tenant = makeTenant({ stripeCustomerId: 'cus_x', currency: 'RUB' });

    await expect(
      createCheckoutSession({
        tenant,
        plan: 'business',
        interval: 'year',
        successUrl: 'https://app/ok',
        cancelUrl: 'https://app/cancel',
      }),
    ).rejects.toThrow(/No Stripe price configured/);
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it('throws when Stripe returns no URL', async () => {
    mockCheckoutCreate.mockResolvedValueOnce({ url: null });
    const tenant = makeTenant({ stripeCustomerId: 'cus_x' });

    await expect(
      createCheckoutSession({
        tenant,
        plan: 'pro',
        interval: 'month',
        successUrl: 'https://app/ok',
        cancelUrl: 'https://app/cancel',
      }),
    ).rejects.toThrow(/checkout URL/);
  });
});
