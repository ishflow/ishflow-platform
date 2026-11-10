/**
 * Computes the six onboarding "setup progress" flags surfaced via GET
 * /api/mobile/me. Returns `null` once every flag is satisfied so the iOS
 * onboarding widget can collapse itself without an extra round-trip.
 *
 * Counts are issued in parallel inside a single `withBypass` transaction —
 * the route handler already authenticated the caller and supplies a trusted
 * `tenantId`, so we avoid the per-query RLS GUC overhead on this hot path.
 */
import { withBypass } from '@/platform/db/tenant-context';
import type { SetupProgress } from '@ishflow/mobile-api-contract';

export async function getSetupProgress(tenantId: string): Promise<SetupProgress | null> {
  const counts = await withBypass(async (tx) => {
    const [tenant, memberCount, customerCount, productCount, postedInvoiceCount] =
      await Promise.all([
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: { demoImportedAt: true },
        }),
        tx.membership.count({ where: { tenantId } }),
        tx.catalog_sales_customer.count({ where: { tenantId } }),
        tx.catalog_inventory_product.count({ where: { tenantId } }),
        tx.document_sales_invoice.count({
          where: { tenantId, status: 'POSTED' },
        }),
      ]);
    return { tenant, memberCount, customerCount, productCount, postedInvoiceCount };
  });

  const progress: SetupProgress = {
    workspaceCreated: true,
    demoImported: counts.tenant?.demoImportedAt != null,
    invitesSent: counts.memberCount > 1,
    firstCustomerAdded: counts.customerCount > 0,
    firstProductAdded: counts.productCount > 0,
    firstInvoicePosted: counts.postedInvoiceCount > 0,
  };

  const allDone = Object.values(progress).every((v) => v === true);
  return allDone ? null : progress;
}
