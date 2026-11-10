import { withBypass } from '@/platform/db/tenant-context';
import { z } from 'zod';

/**
 * Support-ticket producer.
 *
 * The `support_ticket` table is a **platform-level** table: its
 * `CREATE TABLE` (migration `20260514000000_super_admin_mega`) ships only
 * indexes — there is NO `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` for it
 * anywhere under `prisma/migrations/`, and both `tenant_id` + `user_id` are
 * nullable. The super-admin console reads it via `withBypass`
 * (`defineSuperAdminCatalog`), so there is no RLS GUC (`app.tenant_id`) that
 * would scope an insert.
 *
 * Therefore we create through `withBypass`, setting `tenantId` + `userId`
 * **explicitly from the already-verified server context** (never from client
 * input). This is the documented use of `withBypass`: a trusted server
 * operation writing a platform table that RLS does not govern.
 */

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export type CreateSupportTicketContext = {
  /** Resolved from the authenticated server context — never client-supplied. */
  tenantId: string;
  /** Resolved from the authenticated server context — never client-supplied. */
  userId: string;
  /** Captured server-side from the `referer` request header. */
  urlCaptured: string | null;
  /** Captured server-side from the `user-agent` request header. */
  browserAgent: string | null;
};

/**
 * Insert a new `open` support ticket. `input` is validated by the caller (the
 * server action) before reaching here; we re-parse defensively so the helper
 * is safe to call directly. Returns the new ticket id.
 */
export async function createSupportTicketRecord(
  input: CreateSupportTicketInput,
  context: CreateSupportTicketContext,
): Promise<string> {
  const parsed = createSupportTicketSchema.parse(input);

  return withBypass(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        subject: parsed.subject,
        body: parsed.body,
        urlCaptured: context.urlCaptured,
        browserAgent: context.browserAgent,
        status: 'open',
      },
      select: { id: true },
    });
    return ticket.id;
  });
}
