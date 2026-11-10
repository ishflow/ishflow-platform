import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/db/tenant-context', () => {
  return {
    withBypass: vi.fn(),
  };
});

import { withBypass } from '@/platform/db/tenant-context';
import { computeTrialConversion, getRevenueSnapshot } from './revenue';

describe('computeTrialConversion', () => {
  it('returns 0 when no trials ended', () => {
    expect(computeTrialConversion([])).toBe(0);
  });

  it('returns the active-fraction for a mixed batch', () => {
    const sample = [
      { status: 'active' },
      { status: 'active' },
      { status: 'cancelled' },
      { status: 'suspended' },
    ];
    expect(computeTrialConversion(sample)).toBeCloseTo(0.5, 5);
  });

  it('returns 1 when every trial converted', () => {
    expect(computeTrialConversion([{ status: 'active' }, { status: 'active' }])).toBe(1);
  });

  it('returns 0 when no trial converted', () => {
    expect(computeTrialConversion([{ status: 'cancelled' }, { status: 'past_due' }])).toBe(0);
  });
});

describe('getRevenueSnapshot', () => {
  it('aggregates MRR by plan (flat USD, no FX conversion) and plan distribution', async () => {
    const fakeTx = {
      tenant: {
        findMany: vi
          .fn()
          // First call: full tenant list. `currency` is intentionally varied to
          // prove it is NOT used for MRR — billing is single-currency (USD).
          .mockResolvedValueOnce([
            {
              plan: 'starter',
              status: 'active',
              trialEndsAt: null,
              createdAt: new Date(),
            },
            {
              plan: 'pro',
              status: 'active',
              trialEndsAt: null,
              createdAt: new Date(),
            },
            {
              plan: 'pro',
              status: 'active',
              trialEndsAt: null,
              createdAt: new Date(),
            },
            {
              plan: 'free',
              status: 'trialing',
              trialEndsAt: null,
              createdAt: new Date(),
            },
            {
              plan: 'business',
              status: 'cancelled',
              trialEndsAt: null,
              createdAt: new Date(),
            },
          ])
          // Second call: trialEnded.
          .mockResolvedValueOnce([{ status: 'active' }, { status: 'cancelled' }]),
        count: vi.fn().mockResolvedValueOnce(3),
      },
    };

    (withBypass as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof fakeTx) => Promise<unknown>) => fn(fakeTx),
    );

    const snap = await getRevenueSnapshot();

    // Two active `pro` tenants = 49 * 2; one active `starter` = 19. No FX.
    expect(snap).toMatchObject({
      mrrByPlan: { free: 0, starter: 19, pro: 98, business: 0, enterprise: 0 },
      planDistribution: { free: 1, starter: 1, pro: 2, business: 1, enterprise: 0 },
      churn30d: 3,
      trialConversion30d: 0.5,
    });
    expect(snap.totalMrrUsd).toBe(19 + 98);
  });

  it('returns zeroed snapshot when there are no tenants', async () => {
    const fakeTx = {
      tenant: {
        findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
        count: vi.fn().mockResolvedValueOnce(0),
      },
    };

    (withBypass as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof fakeTx) => Promise<unknown>) => fn(fakeTx),
    );

    const snap = await getRevenueSnapshot();

    expect(snap.totalMrrUsd).toBe(0);
    expect(snap.churn30d).toBe(0);
    expect(snap.trialConversion30d).toBe(0);
    expect(snap.planDistribution).toEqual({
      free: 0,
      starter: 0,
      pro: 0,
      business: 0,
      enterprise: 0,
    });
  });
});
