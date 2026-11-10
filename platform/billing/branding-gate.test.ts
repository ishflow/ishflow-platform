import type { TenantPlan } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { canUseBranding, requireBranding } from './branding-gate';
import { PlanFeatureError } from './features';

const NOW = new Date('2026-05-12T12:00:00Z');
const FUTURE = new Date('2026-05-13T12:00:00Z'); // now + 1d

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('canUseBranding / requireBranding', () => {
  it('business plan: canUseBranding true and requireBranding does not throw', () => {
    const tenant = {
      plan: 'business' as TenantPlan,
      status: 'active' as const,
      trialEndsAt: null,
    };
    expect(canUseBranding(tenant)).toBe(true);
    expect(() => requireBranding(tenant)).not.toThrow();
  });

  it('free plan: canUseBranding false and requireBranding throws PlanFeatureError (flag=customBranding, upgradeTo=business)', () => {
    const tenant = {
      plan: 'free' as TenantPlan,
      status: 'active' as const,
      trialEndsAt: null,
    };
    expect(canUseBranding(tenant)).toBe(false);
    try {
      requireBranding(tenant);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PlanFeatureError);
      const pfe = err as PlanFeatureError;
      expect(pfe.flag).toBe('customBranding');
      expect(pfe.upgradeTo).toBe('business');
    }
  });

  it('trialing tenant on free plan: canUseBranding false (trial grants pro, pro does not include customBranding)', () => {
    const tenant = {
      plan: 'free' as TenantPlan,
      status: 'trialing' as const,
      trialEndsAt: FUTURE,
    };
    expect(canUseBranding(tenant)).toBe(false);
  });
});
