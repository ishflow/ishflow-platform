import { computeMrr } from '@/platform/billing/mrr';
import { withBypass } from '@/platform/db/tenant-context';

export interface DashboardStats {
  tenantCount: number;
  activeTenants: number;
  trialingTenants: number;
  paidTenants: number;
  mrrUsd: number;
  activeUsers30d: number;
  churn30d: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return withBypass(async (tx) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [tenants, activeUsers, churn] = await Promise.all([
      tx.tenant.findMany({
        where: { deletedAt: null },
        select: { plan: true, status: true },
      }),
      tx.user.count({
        where: {
          deletedAt: null,
          auditLogs: { some: { createdAt: { gte: since } } },
        },
      }),
      tx.tenant.count({
        where: { status: 'cancelled', updatedAt: { gte: since } },
      }),
    ]);

    return {
      tenantCount: tenants.length,
      activeTenants: tenants.filter((t) => t.status === 'active').length,
      trialingTenants: tenants.filter((t) => t.status === 'trialing').length,
      paidTenants: tenants.filter(
        (t) => t.plan !== 'free' && (t.status === 'active' || t.status === 'trialing'),
      ).length,
      mrrUsd: Math.round(computeMrr(tenants) * 100) / 100,
      activeUsers30d: activeUsers,
      churn30d: churn,
    };
  });
}
