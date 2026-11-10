/**
 * Top platform actions by volume over a rolling 30-day window — a real
 * proxy for "feature usage" on the Super Admin analytics page. Counts rows
 * in `PlatformAuditLog` grouped by `action` (cross-tenant; SA is
 * operator-only). Replaces the previously-hardcoded TOP_FEATURES fixture.
 */

import { withBypass } from '@/platform/db/tenant-context';

export interface TopActionRow {
  action: string;
  count: number;
  /** Percentage of total actions in the window, rounded to an integer. */
  share: number;
}

export async function computeTopActions(now: Date = new Date(), take = 7): Promise<TopActionRow[]> {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const grouped = await withBypass((tx) =>
    tx.platformAuditLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: since } },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take,
    }),
  );

  const total = grouped.reduce((sum, g) => sum + g._count.action, 0);
  return grouped.map((g) => ({
    action: g.action,
    count: g._count.action,
    share: total > 0 ? Math.round((g._count.action / total) * 100) : 0,
  }));
}
