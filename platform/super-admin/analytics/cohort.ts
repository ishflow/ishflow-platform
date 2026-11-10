/**
 * Cohort retention table for the Super Admin analytics page.
 *
 * Cohorts are bucketed by tenant signup week (UTC ISO week). A tenant
 * counts as retained in week N if **any** member of the tenant authored a
 * `PlatformAuditLog` row inside that week-window relative to its signup
 * week.
 *
 * Returns the most recent 12 cohort weeks so the table renders compactly.
 * Older data is still useful but rarely worth scrolling through.
 */

import { withBypass } from '@/platform/db/tenant-context';

export interface CohortRow {
  cohortStart: string; // YYYY-MM-DD (Monday in UTC)
  size: number;
  retention: {
    w1: number;
    w2: number;
    w4: number;
    w8: number;
    w12: number;
  };
}

function startOfUtcWeek(d: Date): Date {
  // ISO week starts on Monday.
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = c.getUTCDay(); // 0 = Sunday
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  c.setUTCDate(c.getUTCDate() + diff);
  return c;
}

function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + days);
  return c;
}

/** Build cohort retention for the last 12 weeks. */
export async function computeCohortRetention(now: Date = new Date()): Promise<CohortRow[]> {
  const today = startOfUtcWeek(now);
  const cohortStart12wkAgo = addDays(today, -7 * 12);

  return withBypass(async (tx) => {
    // Tenants in the window — track id, signup week.
    const tenants = await tx.tenant.findMany({
      where: { createdAt: { gte: cohortStart12wkAgo } },
      select: { id: true, createdAt: true },
    });
    if (tenants.length === 0) return [];

    // Pull memberships → clerkIds → audit rows. We just need which weeks
    // each clerkId was active, and the tenant→clerkIds map.
    const memberships = await tx.membership.findMany({
      where: { tenantId: { in: tenants.map((t) => t.id) } },
      include: { user: { select: { clerkId: true } } },
    });
    const tenantToClerkIds = new Map<string, Set<string>>();
    for (const m of memberships) {
      let s = tenantToClerkIds.get(m.tenantId);
      if (!s) {
        s = new Set();
        tenantToClerkIds.set(m.tenantId, s);
      }
      s.add(m.user.clerkId);
    }
    const allClerkIds = Array.from(new Set(memberships.map((m) => m.user.clerkId)));
    const auditRows =
      allClerkIds.length === 0
        ? []
        : await tx.platformAuditLog.findMany({
            where: {
              actorClerkId: { in: allClerkIds },
              createdAt: { gte: cohortStart12wkAgo },
            },
            select: { actorClerkId: true, createdAt: true },
          });

    // Map: clerkId → Set<weekKey YYYY-MM-DD>
    const activeWeeksByClerk = new Map<string, Set<string>>();
    for (const r of auditRows) {
      const wk = startOfUtcWeek(r.createdAt).toISOString().slice(0, 10);
      let s = activeWeeksByClerk.get(r.actorClerkId);
      if (!s) {
        s = new Set();
        activeWeeksByClerk.set(r.actorClerkId, s);
      }
      s.add(wk);
    }

    // Bucket tenants into cohort weeks.
    const cohortBuckets = new Map<string, string[]>(); // cohortStart -> tenantIds
    for (const t of tenants) {
      const cohort = startOfUtcWeek(t.createdAt).toISOString().slice(0, 10);
      let s = cohortBuckets.get(cohort);
      if (!s) {
        s = [];
        cohortBuckets.set(cohort, s);
      }
      s.push(t.id);
    }

    const offsets: Array<keyof CohortRow['retention']> = ['w1', 'w2', 'w4', 'w8', 'w12'];
    const offsetWeeks: Record<keyof CohortRow['retention'], number> = {
      w1: 1,
      w2: 2,
      w4: 4,
      w8: 8,
      w12: 12,
    };

    const out: CohortRow[] = [];
    for (const [cohortStart, tenantIds] of cohortBuckets) {
      const retention: CohortRow['retention'] = { w1: 0, w2: 0, w4: 0, w8: 0, w12: 0 };
      const cohortDate = new Date(`${cohortStart}T00:00:00Z`);
      for (const tenantId of tenantIds) {
        const clerkIds = tenantToClerkIds.get(tenantId);
        if (!clerkIds) continue;
        for (const key of offsets) {
          const wkN = addDays(cohortDate, offsetWeeks[key] * 7)
            .toISOString()
            .slice(0, 10);
          let retained = false;
          for (const cid of clerkIds) {
            if (activeWeeksByClerk.get(cid)?.has(wkN)) {
              retained = true;
              break;
            }
          }
          if (retained) retention[key] += 1;
        }
      }
      out.push({ cohortStart, size: tenantIds.length, retention });
    }

    return out.sort((a, b) => (a.cohortStart < b.cohortStart ? 1 : -1));
  });
}
