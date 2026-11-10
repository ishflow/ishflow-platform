import type { TenantPlan } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  type FeatureFlag,
  PlanFeatureError,
  assertFeature,
  hasFeature,
  minimumPlanFor,
} from './features';
import { PLAN_FEATURES } from './plans';

const NOW = new Date('2026-05-12T12:00:00Z');
const FUTURE = new Date('2026-05-13T12:00:00Z'); // now + 1d
const PAST = new Date('2026-05-11T12:00:00Z'); // now - 1d

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

const PLANS: TenantPlan[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
const FLAGS: FeatureFlag[] = [
  'advancedReports',
  'periodClose',
  'apiAccess',
  'customBranding',
  'sso',
];

describe('hasFeature', () => {
  it('matches PLAN_FEATURES matrix for every plan × flag (status=active)', () => {
    for (const plan of PLANS) {
      for (const flag of FLAGS) {
        expect(hasFeature({ plan, status: 'active', trialEndsAt: null }, flag)).toBe(
          PLAN_FEATURES[plan][flag],
        );
      }
    }
  });

  it('grants pro-level features during an active trial regardless of stored plan', () => {
    const tenant = {
      plan: 'free' as TenantPlan,
      status: 'trialing' as const,
      trialEndsAt: FUTURE,
    };
    expect(hasFeature(tenant, 'advancedReports')).toBe(true);
    expect(hasFeature(tenant, 'periodClose')).toBe(true);
    // pro does NOT have apiAccess
    expect(hasFeature(tenant, 'apiAccess')).toBe(false);
    expect(hasFeature(tenant, 'customBranding')).toBe(false);
    expect(hasFeature(tenant, 'sso')).toBe(false);
  });

  it('falls back to stored plan when trial has expired', () => {
    const tenant = {
      plan: 'free' as TenantPlan,
      status: 'trialing' as const,
      trialEndsAt: PAST,
    };
    expect(hasFeature(tenant, 'advancedReports')).toBe(false);
    expect(hasFeature(tenant, 'periodClose')).toBe(false);
  });
});

describe('minimumPlanFor', () => {
  it('returns pro for advancedReports', () => {
    expect(minimumPlanFor('advancedReports')).toBe('pro');
  });

  it('returns pro for periodClose', () => {
    expect(minimumPlanFor('periodClose')).toBe('pro');
  });

  it('returns business for apiAccess', () => {
    expect(minimumPlanFor('apiAccess')).toBe('business');
  });

  it('returns business for customBranding', () => {
    expect(minimumPlanFor('customBranding')).toBe('business');
  });

  it('returns enterprise for sso', () => {
    expect(minimumPlanFor('sso')).toBe('enterprise');
  });
});

describe('assertFeature', () => {
  it('throws PlanFeatureError when flag is locked on free plan', () => {
    expect(() =>
      assertFeature({ plan: 'free', status: 'active', trialEndsAt: null }, 'advancedReports'),
    ).toThrow(PlanFeatureError);
  });

  it('sets flag and upgradeTo on the thrown error', () => {
    try {
      assertFeature({ plan: 'starter', status: 'active', trialEndsAt: null }, 'apiAccess');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PlanFeatureError);
      const pfe = err as PlanFeatureError;
      expect(pfe.flag).toBe('apiAccess');
      expect(pfe.upgradeTo).toBe('business');
    }
  });

  it('does not throw when feature is granted on the stored plan', () => {
    expect(() =>
      assertFeature({ plan: 'pro', status: 'active', trialEndsAt: null }, 'advancedReports'),
    ).not.toThrow();
  });

  it('does not throw when feature is granted via active trial', () => {
    expect(() =>
      assertFeature({ plan: 'free', status: 'trialing', trialEndsAt: FUTURE }, 'periodClose'),
    ).not.toThrow();
  });

  it('throws when feature is locked even on active trial (apiAccess > pro)', () => {
    expect(() =>
      assertFeature({ plan: 'free', status: 'trialing', trialEndsAt: FUTURE }, 'apiAccess'),
    ).toThrow(PlanFeatureError);
  });
});

describe('PlanFeatureError', () => {
  it('has name PlanFeatureError and message feature_locked:<flag>', () => {
    const err = new PlanFeatureError('sso', 'enterprise');
    expect(err.name).toBe('PlanFeatureError');
    expect(err.message).toBe('feature_locked:sso');
  });

  it('toJSON returns { error, flag, upgradeTo }', () => {
    const err = new PlanFeatureError('apiAccess', 'business');
    expect(err.toJSON()).toEqual({
      error: 'feature_locked',
      flag: 'apiAccess',
      upgradeTo: 'business',
    });
  });
});
