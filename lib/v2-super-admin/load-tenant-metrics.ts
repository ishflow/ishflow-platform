import { withBypass } from '@/platform/db/tenant-context';
import { cache } from 'react';

export type SaTenantMetrics = {
  /** Number of BillingEvent rows with processingError != null in the last 30 days. */
  failedPayments30d: number;
  /** Most recent BillingEvent.createdAt for this tenant (any status), or null. */
  lastSyncAt: Date | null;
};

/**
 * Per-request cached metrics loader for the V2 super-admin tenant vitals
 * tab. Pure BillingEvent aggregates — no Sentry / external service deps.
 *
 * `failedPayments30d` counts rows where `processingError` is non-null in
 * the last 30 days, capturing Stripe webhook failures (signature mismatch,
 * duplicate event, transient error).
 *
 * `lastSyncAt` returns the most recent BillingEvent.createdAt regardless of
 * processing state — useful as a proxy for "we received Stripe traffic
 * recently" even if nothing has paid yet.
 */
export const loadSaTenantMetrics = cache(async (tenantId: string): Promise<SaTenantMetrics> => {
  return withBypass(async (tx) => {
    const txTyped = tx as {
      billingEvent: {
        count: (args: unknown) => Promise<number>;
        findFirst: (args: unknown) => Promise<{ createdAt: Date } | null>;
      };
    };

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [failed, latest] = await Promise.all([
      txTyped.billingEvent.count({
        where: {
          tenantId,
          processingError: { not: null },
          createdAt: { gte: since },
        },
      }),
      txTyped.billingEvent.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      failedPayments30d: failed,
      lastSyncAt: latest?.createdAt ?? null,
    };
  });
});
