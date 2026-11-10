import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { effectivePlan, isInActiveTrial, trialShouldExpire } from './trial';

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

describe('isInActiveTrial', () => {
  it('returns true when status=trialing and trialEndsAt is in the future', () => {
    expect(isInActiveTrial({ status: 'trialing', trialEndsAt: FUTURE })).toBe(true);
  });

  it('returns false when status=trialing but trialEndsAt is in the past', () => {
    expect(isInActiveTrial({ status: 'trialing', trialEndsAt: PAST })).toBe(false);
  });

  it('returns false when status=trialing but trialEndsAt is null', () => {
    expect(isInActiveTrial({ status: 'trialing', trialEndsAt: null })).toBe(false);
  });

  it('returns false when status=active even with future trialEndsAt', () => {
    expect(isInActiveTrial({ status: 'active', trialEndsAt: FUTURE })).toBe(false);
  });

  it('returns false when status=cancelled even with future trialEndsAt', () => {
    expect(isInActiveTrial({ status: 'cancelled', trialEndsAt: FUTURE })).toBe(false);
  });

  it('returns false when status=past_due with null trialEndsAt', () => {
    expect(isInActiveTrial({ status: 'past_due', trialEndsAt: null })).toBe(false);
  });
});

describe('trialShouldExpire', () => {
  it('returns true when trialing and trialEndsAt is in the past', () => {
    expect(trialShouldExpire({ status: 'trialing', trialEndsAt: PAST })).toBe(true);
  });

  it('returns false when trialing and trialEndsAt is in the future', () => {
    expect(trialShouldExpire({ status: 'trialing', trialEndsAt: FUTURE })).toBe(false);
  });

  it('returns false when trialEndsAt is null', () => {
    expect(trialShouldExpire({ status: 'trialing', trialEndsAt: null })).toBe(false);
  });

  it('returns false when status is not trialing', () => {
    expect(trialShouldExpire({ status: 'active', trialEndsAt: PAST })).toBe(false);
  });
});

describe('effectivePlan', () => {
  it('returns pro when trialing+future regardless of stored plan (free)', () => {
    expect(
      effectivePlan({
        status: 'trialing',
        trialEndsAt: FUTURE,
        plan: 'free',
      }),
    ).toBe('pro');
  });

  it('returns pro when trialing+future regardless of stored plan (starter)', () => {
    expect(
      effectivePlan({
        status: 'trialing',
        trialEndsAt: FUTURE,
        plan: 'starter',
      }),
    ).toBe('pro');
  });

  it('returns stored plan when trialing+past', () => {
    expect(
      effectivePlan({
        status: 'trialing',
        trialEndsAt: PAST,
        plan: 'free',
      }),
    ).toBe('free');
  });

  it('returns stored plan when trialing+null', () => {
    expect(
      effectivePlan({
        status: 'trialing',
        trialEndsAt: null,
        plan: 'free',
      }),
    ).toBe('free');
  });

  it('returns stored plan when status=active', () => {
    expect(
      effectivePlan({
        status: 'active',
        trialEndsAt: FUTURE,
        plan: 'starter',
      }),
    ).toBe('starter');
  });

  it('returns stored plan when status=cancelled', () => {
    expect(
      effectivePlan({
        status: 'cancelled',
        trialEndsAt: FUTURE,
        plan: 'pro',
      }),
    ).toBe('pro');
  });

  it('returns stored plan when status=past_due', () => {
    expect(
      effectivePlan({
        status: 'past_due',
        trialEndsAt: null,
        plan: 'business',
      }),
    ).toBe('business');
  });
});
