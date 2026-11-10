import { monthlyUsd } from '@/platform/billing/mrr';
import { withBypass } from '@/platform/db/tenant-context';
import { cache } from 'react';

export type SaTenantPlan = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

export type SaTenantRecord = {
  id: string;
  name: string;
  slug: string;
  plan: SaTenantPlan;
  status: string;
  defaultLocale: string;
  currency: string;
  lastActivityAt: Date | null;
  createdAt: Date;
  members: number;
  invoices: number;
  mrrUsd: number;
};

/**
 * Per-request cached loader. Multiple components in the same render tree
 * (layout + overview + vitals) all read from this; cache() guarantees a
 * single DB roundtrip per request.
 */
export const loadSaTenant = cache(async (tenantId: string): Promise<SaTenantRecord | null> => {
  return withBypass(async (tx) => {
    const txTyped = tx as {
      tenant: {
        findUnique: (args: unknown) => Promise<
          | (Record<string, unknown> & {
              id: string;
              name: string;
              slug: string;
              plan: string;
              status: string;
              defaultLocale: string;
              currency: string;
              lastActivityAt: Date | null;
              createdAt: Date;
              deletedAt: Date | null;
              _count: { memberships: number };
            })
          | null
        >;
      };
      document_sales_invoice: {
        count: (args: unknown) => Promise<number>;
      };
    };

    const t = await txTyped.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { memberships: true } } },
    });
    if (!t || t.deletedAt) return null;

    const invoices = await txTyped.document_sales_invoice.count({ where: { tenantId } });
    const planKey = t.plan as SaTenantPlan;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: planKey,
      status: t.status,
      defaultLocale: t.defaultLocale,
      currency: t.currency,
      lastActivityAt: t.lastActivityAt,
      createdAt: t.createdAt,
      members: t._count.memberships,
      invoices,
      mrrUsd: monthlyUsd(planKey),
    };
  });
});
