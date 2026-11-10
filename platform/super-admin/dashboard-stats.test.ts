import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithBypass = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

import { getDashboardStats } from './dashboard-stats';

// Single billing currency: USD. Flat plan prices, no FX conversion.
const PLAN_USD_PER_MONTH: Record<string, number> = {
  free: 0,
  starter: 19,
  pro: 49,
  business: 149,
  enterprise: 499,
};

type TenantRow = { plan: string; status: string };

interface MockTx {
  tenant: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  user: {
    count: ReturnType<typeof vi.fn>;
  };
}

function makeTx(tenants: TenantRow[], activeUsers: number, churn: number): MockTx {
  return {
    tenant: {
      findMany: vi.fn().mockResolvedValue(tenants),
      count: vi.fn().mockResolvedValue(churn),
    },
    user: {
      count: vi.fn().mockResolvedValue(activeUsers),
    },
  };
}

describe('getDashboardStats', () => {
  beforeEach(() => {
    mockWithBypass.mockReset();
  });

  it('returns zero across all fields when there are no tenants or users', async () => {
    const tx = makeTx([], 0, 0);
    mockWithBypass.mockImplementation(async (fn: (tx: MockTx) => Promise<unknown>) => fn(tx));

    const stats = await getDashboardStats();
    expect(stats).toEqual({
      tenantCount: 0,
      activeTenants: 0,
      trialingTenants: 0,
      paidTenants: 0,
      mrrUsd: 0,
      activeUsers30d: 0,
      churn30d: 0,
    });
  });

  it('computes all six fields from controlled fixture data', async () => {
    const tenants: TenantRow[] = [
      { plan: 'pro', status: 'active' },
      { plan: 'business', status: 'active' },
      { plan: 'starter', status: 'trialing' },
      { plan: 'starter', status: 'trialing' },
      { plan: 'pro', status: 'cancelled' },
      { plan: 'free', status: 'active' },
    ];
    const tx = makeTx(tenants, 42, 3);
    mockWithBypass.mockImplementation(async (fn: (tx: MockTx) => Promise<unknown>) => fn(tx));

    const stats = await getDashboardStats();

    expect(stats.tenantCount).toBe(6);
    expect(stats.activeTenants).toBe(3); // pro + business + free
    expect(stats.trialingTenants).toBe(2);
    // paid = non-free AND active|trialing: pro/active + business/active + 2×starter/trialing
    expect(stats.paidTenants).toBe(4);
    expect(stats.activeUsers30d).toBe(42);
    expect(stats.churn30d).toBe(3);
    // MRR sums only active tenants in flat USD: pro + business + free(=0)
    expect(stats.mrrUsd).toBe((PLAN_USD_PER_MONTH.pro ?? 0) + (PLAN_USD_PER_MONTH.business ?? 0));
  });

  it('uses the flat USD plan price regardless of tenant currency', async () => {
    // No FX: an active starter tenant is always 19 USD, never a converted value.
    const tenants: TenantRow[] = [{ plan: 'starter', status: 'active' }];
    const tx = makeTx(tenants, 0, 0);
    mockWithBypass.mockImplementation(async (fn: (tx: MockTx) => Promise<unknown>) => fn(tx));

    const stats = await getDashboardStats();
    expect(stats.mrrUsd).toBe(PLAN_USD_PER_MONTH.starter);
  });
});
