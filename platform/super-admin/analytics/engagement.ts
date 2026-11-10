/**
 * DAU / WAU / MAU + 30-day daily-active-actor series for the Super Admin
 * analytics page.
 *
 * "Active" is defined as having authored at least one row in
 * `PlatformAuditLog` within the rolling window. Cross-tenant, since SA is
 * operator-only.
 */

import { withBypass } from '@/platform/db/tenant-context';
import type { Prisma } from '@prisma/client';

export interface EngagementDailyPoint {
  day: string; // ISO date (YYYY-MM-DD)
  actors: number;
}

export interface EngagementSummary {
  dau: number;
  wau: number;
  mau: number;
  daily: EngagementDailyPoint[]; // 30-day series, oldest → newest
}

function startOfUtcDay(d: Date): Date {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

/**
 * Compute DAU/WAU/MAU using a single `findMany` for the 30-day window and
 * bucketing in JS. Far cheaper than 3 raw queries per page load and
 * tolerable up to ~100k audit rows / 30d.
 */
export async function computeEngagement(now: Date = new Date()): Promise<EngagementSummary> {
  const today = startOfUtcDay(now);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 29); // 30-day window inclusive

  const rows = await withBypass((tx) =>
    tx.platformAuditLog.findMany({
      where: { createdAt: { gte: start } } satisfies Prisma.PlatformAuditLogWhereInput,
      select: { actorClerkId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 200000,
    }),
  );

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const dauStart = new Date(today);
  const wauStart = new Date(today);
  wauStart.setUTCDate(wauStart.getUTCDate() - 6);
  const mauStart = start;

  const dauSet = new Set<string>();
  const wauSet = new Set<string>();
  const mauSet = new Set<string>();
  const perDay = new Map<string, Set<string>>();

  for (const r of rows) {
    const d = r.createdAt;
    const key = dayKey(d);
    let bucket = perDay.get(key);
    if (!bucket) {
      bucket = new Set();
      perDay.set(key, bucket);
    }
    bucket.add(r.actorClerkId);

    if (d >= dauStart) dauSet.add(r.actorClerkId);
    if (d >= wauStart) wauSet.add(r.actorClerkId);
    if (d >= mauStart) mauSet.add(r.actorClerkId);
  }

  const daily: EngagementDailyPoint[] = [];
  for (let i = 0; i < 30; i += 1) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + i);
    const key = dayKey(day);
    daily.push({ day: key, actors: perDay.get(key)?.size ?? 0 });
  }

  return {
    dau: dauSet.size,
    wau: wauSet.size,
    mau: mauSet.size,
    daily,
  };
}
