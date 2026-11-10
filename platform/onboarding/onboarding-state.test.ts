import { prisma } from '@/platform/db';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_ONBOARDING_STATE,
  OnboardingStateSchema,
  getOnboardingState,
  setOnboardingState,
} from './onboarding-state';

describe('OnboardingStateSchema', () => {
  it('defaults all fields when given empty object', () => {
    const parsed = OnboardingStateSchema.parse({});
    expect(parsed).toEqual({ dismissed: false, completedSteps: [], demoLoaded: false });
  });

  it('rejects unknown shapes', () => {
    expect(() => OnboardingStateSchema.parse({ dismissed: 'yes' })).toThrow();
    expect(() => OnboardingStateSchema.parse({ completedSteps: 'a,b' })).toThrow();
  });

  it('preserves provided fields', () => {
    const parsed = OnboardingStateSchema.parse({
      dismissed: true,
      completedSteps: ['first_customer'],
      demoLoaded: true,
    });
    expect(parsed.dismissed).toBe(true);
    expect(parsed.completedSteps).toEqual(['first_customer']);
    expect(parsed.demoLoaded).toBe(true);
  });
});

describe('getOnboardingState + setOnboardingState', () => {
  let tenantId: string;

  beforeEach(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        clerkOrgId: `org_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: 'onboarding-state-test',
        slug: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      select: { id: true },
    });
    tenantId = tenant.id;
  });

  it('returns defaults when row has null state', async () => {
    const state = await getOnboardingState(tenantId);
    expect(state).toEqual(DEFAULT_ONBOARDING_STATE);
  });

  it('returns defaults when row stores malformed JSON', async () => {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingState: { junk: true } as unknown as object },
    });
    const state = await getOnboardingState(tenantId);
    expect(state).toEqual(DEFAULT_ONBOARDING_STATE);
  });

  it('shallow-merges partial writes', async () => {
    await setOnboardingState(tenantId, { dismissed: true });
    let state = await getOnboardingState(tenantId);
    expect(state).toEqual({ dismissed: true, completedSteps: [], demoLoaded: false });

    await setOnboardingState(tenantId, { demoLoaded: true });
    state = await getOnboardingState(tenantId);
    expect(state).toEqual({ dismissed: true, completedSteps: [], demoLoaded: true });
  });

  it('overwrites array fields cleanly', async () => {
    await setOnboardingState(tenantId, { completedSteps: ['first_customer'] });
    await setOnboardingState(tenantId, { completedSteps: ['first_invoice'] });
    const state = await getOnboardingState(tenantId);
    expect(state.completedSteps).toEqual(['first_invoice']);
  });
});
