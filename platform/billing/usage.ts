/**
 * Returns the four billable usage counters for a tenant:
 *
 * - `members`            – active memberships + pending Clerk invitations
 *                          (both consume a billing seat against the plan cap)
 * - `monthlyPostedDocs`  – POSTED documents in the current UTC calendar
 *                          month, summed across every document table
 * - `storageBytes`       – sum of attachment sizes (soft-deleted rows
 *                          included; webhook downgrade-cleanup logic
 *                          handles purging if needed)
 * - `savedViews`         – non-deleted saved views
 *
 * Issued in a single `withBypass` transaction — the caller is trusted
 * (server-side admin / engine), so we skip the per-query RLS GUC cost.
 */
import { withBypass } from '@/platform/db/tenant-context';
import { clerkClient } from '@clerk/nextjs/server';

export interface UsageSnapshot {
  members: number;
  monthlyPostedDocs: number;
  storageBytes: number;
  savedViews: number;
}

function startOfCurrentMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getUsage(tenantId: string): Promise<UsageSnapshot> {
  const snapshot = await withBypass(async (tx) => {
    const periodStart = startOfCurrentMonthUTC();
    const postedWhere = {
      tenantId,
      status: 'POSTED',
      postedAt: { gte: periodStart },
    } as const;

    const [
      members,
      salesInvoices,
      salesPayments,
      purchaseInvoices,
      purchasePayments,
      priceSettings,
      storageAgg,
      savedViews,
    ] = await Promise.all([
      tx.membership.count({ where: { tenantId } }),
      tx.document_sales_invoice.count({ where: postedWhere }),
      tx.document_sales_payment_received.count({ where: postedWhere }),
      tx.document_purchases_invoice.count({ where: postedWhere }),
      tx.document_purchases_payment_sent.count({ where: postedWhere }),
      tx.document_inventory_price_setting.count({ where: postedWhere }),
      tx.attachment.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { size: true },
      }),
      tx.savedView.count({ where: { tenantId, deletedAt: null } }),
    ]);

    return {
      members,
      monthlyPostedDocs:
        salesInvoices + salesPayments + purchaseInvoices + purchasePayments + priceSettings,
      storageBytes: Number(storageAgg._sum.size ?? 0),
      savedViews,
    };
  });

  // Pending invitations consume a seat too — fetch from Clerk and add to the
  // member count so the plan-limit gate blocks invites at the cap.
  const tenant = await withBypass((tx) =>
    tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { clerkOrgId: true },
    }),
  );

  let pendingInvites = 0;
  try {
    const clerk = await clerkClient();
    const list = await clerk.organizations.getOrganizationInvitationList({
      organizationId: tenant.clerkOrgId,
      status: ['pending'],
    });
    pendingInvites = list.totalCount ?? list.data.length;
  } catch {
    // Clerk down → fall back to active-only. Better to undercount than crash usage.
    pendingInvites = 0;
  }

  return {
    ...snapshot,
    members: snapshot.members + pendingInvites,
  };
}
