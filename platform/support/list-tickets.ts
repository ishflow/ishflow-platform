import { withBypass } from '@/platform/db/tenant-context';
import type { SupportTicketStatus } from '@prisma/client';

/**
 * Shape returned to the tenant-facing support history list.
 * Only the fields the user needs — no internal fields like browserAgent.
 */
export type TenantSupportTicket = {
  id: string;
  subject: string;
  status: SupportTicketStatus;
  resolution: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

/**
 * Fetch the most recent 50 support tickets for a given tenant, newest first.
 *
 * `support_ticket` is a platform-level table with no RLS; we use `withBypass`
 * and filter explicitly by `tenantId` (same pattern as the super-admin console).
 */
export async function listTenantSupportTickets(tenantId: string): Promise<TenantSupportTicket[]> {
  return withBypass((tx) =>
    tx.supportTicket.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        subject: true,
        status: true,
        resolution: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
  );
}
