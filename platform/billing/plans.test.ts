import { describe, expect, it } from 'vitest';
import { PLAN_FEATURES, PLAN_LIMITS, PLAN_RANK, isHigherPlan } from './plans';

describe('PLAN_LIMITS', () => {
  it('has all 5 plan tiers', () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual([
      'business',
      'enterprise',
      'free',
      'pro',
      'starter',
    ]);
  });

  it('uses MAX_SAFE_INTEGER for unlimited', () => {
    expect(PLAN_LIMITS.business.members).toBe(Number.MAX_SAFE_INTEGER);
    expect(PLAN_LIMITS.enterprise.storageBytes).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('plan tiers strictly increase in members + storage', () => {
    const pairs = [
      ['free', 'starter'],
      ['starter', 'pro'],
      ['pro', 'business'],
      ['business', 'enterprise'],
    ] as const;
    for (const [current, next] of pairs) {
      expect(PLAN_LIMITS[next].members).toBeGreaterThanOrEqual(PLAN_LIMITS[current].members);
      expect(PLAN_LIMITS[next].storageBytes).toBeGreaterThanOrEqual(
        PLAN_LIMITS[current].storageBytes,
      );
    }
  });

  it('free + starter have no advanced features', () => {
    for (const plan of ['free', 'starter'] as const) {
      expect(PLAN_FEATURES[plan].advancedReports).toBe(false);
      expect(PLAN_FEATURES[plan].periodClose).toBe(false);
      expect(PLAN_FEATURES[plan].apiAccess).toBe(false);
    }
  });

  it('pro adds advancedReports + periodClose', () => {
    expect(PLAN_FEATURES.pro.advancedReports).toBe(true);
    expect(PLAN_FEATURES.pro.periodClose).toBe(true);
    expect(PLAN_FEATURES.pro.apiAccess).toBe(false);
  });

  it('business adds apiAccess + customBranding', () => {
    expect(PLAN_FEATURES.business.apiAccess).toBe(true);
    expect(PLAN_FEATURES.business.customBranding).toBe(true);
    expect(PLAN_FEATURES.business.sso).toBe(false);
  });

  it('enterprise adds sso', () => {
    expect(PLAN_FEATURES.enterprise.sso).toBe(true);
  });
});

describe('PLAN_RANK', () => {
  it('strictly increases free → enterprise', () => {
    expect(PLAN_RANK.free).toBe(0);
    expect(PLAN_RANK.enterprise).toBe(4);
    expect(isHigherPlan('pro', 'starter')).toBe(true);
    expect(isHigherPlan('free', 'pro')).toBe(false);
  });
});
