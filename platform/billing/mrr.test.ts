import type { Tenant } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { PLAN_PRICES_USD, computeMrr, monthlyUsd } from './mrr';

type MrrTenant = Pick<Tenant, 'plan' | 'status'>;

function t(plan: Tenant['plan'], status: Tenant['status'] = 'active'): MrrTenant {
  return { plan, status };
}

describe('monthlyUsd', () => {
  it('returns 0 for the free plan', () => {
    expect(monthlyUsd('free')).toBe(0);
  });

  it('returns the flat USD price per plan', () => {
    expect(monthlyUsd('starter')).toBe(PLAN_PRICES_USD.starter);
    expect(monthlyUsd('pro')).toBe(PLAN_PRICES_USD.pro);
    expect(monthlyUsd('business')).toBe(PLAN_PRICES_USD.business);
    expect(monthlyUsd('enterprise')).toBe(PLAN_PRICES_USD.enterprise);
  });
});

describe('computeMrr', () => {
  it('returns 0 for empty tenant list', () => {
    expect(computeMrr([])).toBe(0);
  });

  it('sums monthly USD across a mix of free/pro/business active tenants', () => {
    const tenants: MrrTenant[] = [t('free'), t('pro'), t('business')];
    const expected = PLAN_PRICES_USD.free + PLAN_PRICES_USD.pro + PLAN_PRICES_USD.business;
    expect(computeMrr(tenants)).toBe(expected);
  });

  it('excludes trialing, past_due, suspended, and cancelled tenants', () => {
    const tenants: MrrTenant[] = [
      t('pro', 'active'),
      t('business', 'trialing'),
      t('pro', 'past_due'),
      t('pro', 'suspended'),
      t('pro', 'cancelled'),
    ];
    expect(computeMrr(tenants)).toBe(PLAN_PRICES_USD.pro);
  });
});
