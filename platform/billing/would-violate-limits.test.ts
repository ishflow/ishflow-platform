import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAN_LIMITS } from './plans';
import type { UsageSnapshot } from './usage';
import { wouldViolateLimits } from './would-violate-limits';

vi.mock('./usage', () => ({
  getUsage: vi.fn(),
}));

const { getUsage } = await import('./usage');
const getUsageMock = vi.mocked(getUsage);

function makeUsage(overrides: Partial<UsageSnapshot> = {}): UsageSnapshot {
  return {
    members: 0,
    monthlyPostedDocs: 0,
    storageBytes: 0,
    savedViews: 0,
    ...overrides,
  };
}

describe('wouldViolateLimits', () => {
  beforeEach(() => {
    getUsageMock.mockReset();
  });

  it('returns violations when Pro tenant under Pro limits downgrades to Starter and exceeds Starter caps', async () => {
    // Pro allows 15 members, 5000 docs, unlimited saved views.
    // Starter caps: 5 members, 500 docs, 5 GB, 10 saved views.
    getUsageMock.mockResolvedValueOnce(
      makeUsage({
        members: 10, // > starter.members (5)
        monthlyPostedDocs: 1_000, // > starter.monthlyPostedDocs (500)
        storageBytes: 1_000, // < starter.storageBytes (5 GB)
        savedViews: 50, // > starter.savedViews (10)
      }),
    );

    const violations = await wouldViolateLimits({ id: 'tenant-1', plan: 'pro' }, 'starter');

    expect(violations).toEqual([
      { kind: 'members', current: 10, newLimit: PLAN_LIMITS.starter.members },
      {
        kind: 'monthly_posted_docs',
        current: 1_000,
        newLimit: PLAN_LIMITS.starter.monthlyPostedDocs,
      },
      { kind: 'saved_views', current: 50, newLimit: PLAN_LIMITS.starter.savedViews },
    ]);
    expect(getUsageMock).toHaveBeenCalledWith('tenant-1');
  });

  it('returns empty array when Pro tenant within Starter limits downgrades to Starter', async () => {
    getUsageMock.mockResolvedValueOnce(
      makeUsage({
        members: 3, // <= starter.members (5)
        monthlyPostedDocs: 5, // <= starter.monthlyPostedDocs
        storageBytes: 1024, // <= starter.storageBytes (5 GB)
        savedViews: 5, // <= starter.savedViews (10)
      }),
    );

    const violations = await wouldViolateLimits({ id: 'tenant-2', plan: 'pro' }, 'starter');

    expect(violations).toEqual([]);
  });

  it('returns empty array for same-plan (no actual change)', async () => {
    getUsageMock.mockResolvedValueOnce(
      makeUsage({
        members: PLAN_LIMITS.pro.members,
        monthlyPostedDocs: PLAN_LIMITS.pro.monthlyPostedDocs,
        storageBytes: PLAN_LIMITS.pro.storageBytes,
        savedViews: 999,
      }),
    );

    const violations = await wouldViolateLimits({ id: 'tenant-3', plan: 'pro' }, 'pro');

    expect(violations).toEqual([]);
  });
});
