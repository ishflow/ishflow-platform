import { PlanLimitError } from '@/platform/engine/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./assert-plan-allows', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./assert-plan-allows')>();
  return {
    ...actual,
    assertPlanAllows: vi.fn(),
  };
});

import { assertPlanAllows } from './assert-plan-allows';
import { enforcePlanLimit, getBillingEnforcementMode } from './enforce';

const tenant = {
  id: 't-1',
  plan: 'free' as const,
  status: 'active' as const,
  trialEndsAt: null,
};
const action = { kind: 'add_member' as const };

const mockedAssert = vi.mocked(assertPlanAllows);
const ORIGINAL_ENV = process.env.BILLING_ENFORCEMENT;

beforeEach(() => {
  mockedAssert.mockReset();
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    process.env.BILLING_ENFORCEMENT = undefined;
  } else {
    process.env.BILLING_ENFORCEMENT = ORIGINAL_ENV;
  }
});

describe('getBillingEnforcementMode', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 'on' when BILLING_ENFORCEMENT=on", () => {
    vi.stubEnv('BILLING_ENFORCEMENT', 'on');
    expect(getBillingEnforcementMode()).toBe('on');
  });

  it("returns 'off' when BILLING_ENFORCEMENT=off", () => {
    vi.stubEnv('BILLING_ENFORCEMENT', 'off');
    expect(getBillingEnforcementMode()).toBe('off');
  });

  it("returns 'warn' when BILLING_ENFORCEMENT=warn", () => {
    vi.stubEnv('BILLING_ENFORCEMENT', 'warn');
    expect(getBillingEnforcementMode()).toBe('warn');
  });

  it("defaults to 'on' when env is unset and NODE_ENV='production'", () => {
    vi.stubEnv('BILLING_ENFORCEMENT', '');
    vi.stubEnv('NODE_ENV', 'production');
    // `vi.stubEnv('BILLING_ENFORCEMENT', '')` leaves it defined as empty string;
    // ensure the function sees it as "not one of the known values" and falls through.
    expect(getBillingEnforcementMode()).toBe('on');
  });

  it("defaults to 'off' when env is unset and NODE_ENV='development'", () => {
    vi.stubEnv('BILLING_ENFORCEMENT', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(getBillingEnforcementMode()).toBe('off');
  });

  it("defaults to 'off' when env is unset and NODE_ENV='test'", () => {
    vi.stubEnv('BILLING_ENFORCEMENT', '');
    vi.stubEnv('NODE_ENV', 'test');
    expect(getBillingEnforcementMode()).toBe('off');
  });

  it("falls through to default when BILLING_ENFORCEMENT='garbage' and NODE_ENV='production' → 'on'", () => {
    vi.stubEnv('BILLING_ENFORCEMENT', 'garbage');
    vi.stubEnv('NODE_ENV', 'production');
    expect(getBillingEnforcementMode()).toBe('on');
  });
});

describe('enforcePlanLimit', () => {
  it('MODE=off: skips assertPlanAllows entirely even when it would throw', async () => {
    process.env.BILLING_ENFORCEMENT = 'off';
    mockedAssert.mockRejectedValueOnce(new PlanLimitError('members', 5, 5, 'starter'));
    await expect(enforcePlanLimit(tenant, action)).resolves.toBeUndefined();
    expect(mockedAssert).not.toHaveBeenCalled();
  });

  it('MODE=warn: logs warning and does not throw on PlanLimitError', async () => {
    process.env.BILLING_ENFORCEMENT = 'warn';
    const err = new PlanLimitError('members', 5, 5, 'starter');
    mockedAssert.mockRejectedValueOnce(err);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(enforcePlanLimit(tenant, action)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const arg = warnSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(arg);
    expect(parsed).toMatchObject({
      event: 'billing.limit_warn',
      error: 'plan_limit_exceeded',
      kind: 'members',
      current: 5,
      allowed: 5,
      upgradeTo: 'starter',
      tenantId: tenant.id,
    });
    warnSpy.mockRestore();
  });

  it('MODE=on: re-throws PlanLimitError', async () => {
    process.env.BILLING_ENFORCEMENT = 'on';
    const err = new PlanLimitError('members', 5, 5, 'starter');
    mockedAssert.mockRejectedValueOnce(err);
    await expect(enforcePlanLimit(tenant, action)).rejects.toBe(err);
  });

  // TEMP (test 2026-05-29): post_document hard-blocks during manual testing.
  // Restore the `.resolves` + warnSpy version when re-enabling warn-degrade.
  it('MODE=on: post_document over limit throws (TEMP: warn disabled for testing)', async () => {
    process.env.BILLING_ENFORCEMENT = 'on';
    const err = new PlanLimitError('monthly_posted_docs', 10, 10, 'starter');
    mockedAssert.mockRejectedValueOnce(err);
    await expect(enforcePlanLimit(tenant, { kind: 'post_document' })).rejects.toBe(err);
  });

  it('MODE=on: passes through when assertPlanAllows resolves', async () => {
    process.env.BILLING_ENFORCEMENT = 'on';
    mockedAssert.mockResolvedValueOnce(undefined);
    await expect(enforcePlanLimit(tenant, action)).resolves.toBeUndefined();
  });

  it('MODE=warn: still propagates non-PlanLimitError', async () => {
    process.env.BILLING_ENFORCEMENT = 'warn';
    const other = new Error('boom');
    mockedAssert.mockRejectedValueOnce(other);
    await expect(enforcePlanLimit(tenant, action)).rejects.toBe(other);
  });

  it('MODE=on: still propagates non-PlanLimitError', async () => {
    process.env.BILLING_ENFORCEMENT = 'on';
    const other = new Error('boom');
    mockedAssert.mockRejectedValueOnce(other);
    await expect(enforcePlanLimit(tenant, action)).rejects.toBe(other);
  });
});
