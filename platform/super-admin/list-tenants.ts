import { withBypass } from '@/platform/db/tenant-context';
import type { TenantPlan, TenantStatus } from '@prisma/client';

// Single billing currency: USD. A tenant's operational `currency` is reported
// for display but never converted into MRR — the operator console reports
// revenue in USD only.
const PLAN_USD_PER_MONTH: Record<TenantPlan, number> = {
  free: 0,
  starter: 19,
  pro: 49,
  business: 149,
  enterprise: 499,
};

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  currency: string;
  memberCount: number;
  mrrUsd: number;
  lastActivityAt: Date | null;
  createdAt: Date;
}

export interface ListTenantsInput {
  q?: string;
  plan?: TenantPlan;
  status?: TenantStatus;
  limit?: number;
  cursor?: string;
}

export interface ListTenantsResult {
  rows: TenantRow[];
  nextCursor: string | null;
}

/**
 * List tenants for the Super Admin console. Uses `withBypass` because the
 * operator UI lives outside any tenant context.
 *
 * Sort: `lastActivityAt desc nulls last`, then `createdAt desc` as a stable
 * tiebreaker for cursor pagination.
 */
export async function listTenants(input: ListTenantsInput = {}): Promise<ListTenantsResult> {
  const limit = Math.min(input.limit ?? 25, 100);

  return withBypass(async (tx) => {
    const tenants = await tx.tenant.findMany({
      where: {
        deletedAt: null,
        ...(input.plan ? { plan: input.plan } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.q
          ? {
              OR: [
                { name: { contains: input.q, mode: 'insensitive' } },
                { slug: { contains: input.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastActivityAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: limit + 1,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
      include: { _count: { select: { memberships: true } } },
    });

    const hasMore = tenants.length > limit;
    const rows: TenantRow[] = tenants.slice(0, limit).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      currency: t.currency,
      memberCount: t._count.memberships,
      mrrUsd: PLAN_USD_PER_MONTH[t.plan],
      lastActivityAt: t.lastActivityAt,
      createdAt: t.createdAt,
    }));
    const lastRow = rows[rows.length - 1];
    const nextCursor = hasMore && lastRow ? lastRow.id : null;
    return { rows, nextCursor };
  });
}
