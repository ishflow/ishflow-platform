import { withBypass } from '@/platform/db/tenant-context';
import type { TenantPlan, TenantStatus } from '@prisma/client';

export interface SaSubscriptionView {
  id: string;
  name: string;
  plan: TenantPlan;
  status: TenantStatus;
  currency: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: Date | null;
  createdAt: Date;
}

export async function loadSaTenantSubscription(
  tenantId: string,
): Promise<SaSubscriptionView | null> {
  return withBypass(async (tx) => {
    const t = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        status: true,
        currency: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        trialEndsAt: true,
        createdAt: true,
        deletedAt: true,
      },
    });
    if (!t || t.deletedAt) return null;
    return {
      id: t.id,
      name: t.name,
      plan: t.plan,
      status: t.status,
      currency: t.currency,
      stripeCustomerId: t.stripeCustomerId,
      stripeSubscriptionId: t.stripeSubscriptionId,
      trialEndsAt: t.trialEndsAt,
      createdAt: t.createdAt,
    };
  });
}
