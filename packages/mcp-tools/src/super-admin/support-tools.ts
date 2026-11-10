/**
 * Support super-admin tools — hand-written MCP wrappers for the
 * SupportTicket table.
 *
 * All 5 tools require ApiKeyScope `platform_admin`. The MCP route's auth
 * floor is `read`; per-tool scope is enforced inside `dispatchTool` via
 * `requiredScope`. A read or write key naming any of these tools is
 * rejected with `forbidden` before the handler runs.
 *
 * Why some tools use plain `prisma` instead of an engine helper:
 *   The `support_ticket` table has NO RLS policies (see
 *   `prisma/migrations/20260514000000_super_admin_mega/migration.sql`). It
 *   is a global super-admin-only table — like `platform_audit_log` — so
 *   cross-tenant reads do not need to enter `withBypass`. This mirrors the
 *   pattern used in `common.ts` where `platformAuditLog.create` is called
 *   directly via the shared prisma client. The package therefore stays
 *   `withBypass`-free (lint rule from Task 12) without losing the reads.
 *
 * Audit pattern:
 *   - Reads (`support_ticket_list`, `support_ticket_get`) DO NOT write a
 *     channel audit row — observability.
 *   - Writes would write a channel row with `mcp.support.*` prefix and a
 *     PlatformAuditLog tenant_id matching the ticket's tenant (or null when
 *     the ticket is not tied to a tenant — supported by the nullable-tenant
 *     contract in `common.ts:ChannelAuditInput.tenantId`).
 *
 * Deferred tools (Phase 2):
 *   - `support_ticket_assign_to_me` — needs `assignSupportTicket(ticketId,
 *     assigneeUserId)`. No such helper exists under `platform/super-admin/`
 *     on this branch. A direct `prisma.supportTicket.update` would work
 *     since the table has no RLS, but absent a canonical engine audit row
 *     the change would lack the dual-row audit contract. Defer to keep
 *     audit hygiene consistent with the rest of Task 11.
 *   - `support_ticket_close` — same rationale: needs
 *     `closeSupportTicket(ticketId, resolution)`. Status transition +
 *     resolution + resolvedAt update is non-trivial enough that a single
 *     engine helper should own the canonical audit row.
 *   - `support_ticket_link_tenant` — needs `linkSupportTicketTenant(...)`
 *     because the operator action of attaching an orphan ticket to a
 *     tenant is a security-sensitive write that should write a canonical
 *     audit row attributing the link (operator could be re-routing
 *     evidence). Defer.
 *
 *   All three throw `precondition_failed` at handler time; tool registration
 *   keeps the MCP surface stable so a v2 server bump is not required when
 *   the helpers land.
 */
import { prisma } from '@/platform/db';
import { z } from 'zod';
import { ToolError } from '../error-map';
import type { ToolDefinition } from '../types';

const SupportTicketStatusEnum = z.enum(['open', 'in_progress', 'resolved', 'wont_fix']);

/* -------------------------------------------------------------------- */
/* Reads (2)                                                            */
/* -------------------------------------------------------------------- */

export const supportTicketListTool: ToolDefinition = {
  name: 'support_ticket_list',
  description:
    'List support tickets across all tenants. Filterable by `status` (open / in_progress / resolved / wont_fix) and `tenantId`. Sort: createdAt desc. `limit` defaults to 50 and caps at 200. Cursor-paginated via the last row id. Returns { rows, nextCursor }.',
  inputSchema: z.object({
    status: SupportTicketStatusEnum.optional(),
    tenantId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).optional(),
    cursor: z.string().uuid().optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    const limit = input.limit ?? 50;
    const records = await prisma.supportTicket.findMany({
      where: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    });
    const hasMore = records.length > limit;
    const rows = records.slice(0, limit);
    const lastRow = rows[rows.length - 1];
    const nextCursor = hasMore && lastRow ? lastRow.id : null;
    return { rows, nextCursor };
  },
};

export const supportTicketGetTool: ToolDefinition = {
  name: 'support_ticket_get',
  description:
    'Fetch a single support ticket by id. Returns null when the id is unknown (no error). `support_ticket` has no RLS policies (global table) so the read crosses tenants without entering withBypass.',
  inputSchema: z.object({
    ticketId: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    return prisma.supportTicket.findUnique({ where: { id: input.ticketId } });
  },
};

/* -------------------------------------------------------------------- */
/* Writes (3 — all deferred to Phase 2)                                 */
/* -------------------------------------------------------------------- */

export const supportTicketAssignToMeTool: ToolDefinition = {
  name: 'support_ticket_assign_to_me',
  description:
    'Assign a support ticket to the calling operator (sets `assignedTo` to the actor\'s user id). DEFERRED to Phase 2 — no `assignSupportTicket` helper exists under platform/super-admin/ yet, and writing inline here would skip the canonical engine audit row required by the dual-row audit contract. Calling this tool today returns precondition_failed.',
  inputSchema: z.object({
    ticketId: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async () => {
    throw new ToolError(
      'precondition_failed',
      'support_ticket_assign_to_me is deferred to Phase 2 — assignSupportTicket helper not yet extracted to platform/',
    );
  },
};

export const supportTicketCloseTool: ToolDefinition = {
  name: 'support_ticket_close',
  description:
    'Close a support ticket with a resolution and a target status (`resolved` or `wont_fix`). Sets `resolvedAt = now()`. DEFERRED to Phase 2 — no `closeSupportTicket` helper exists; the status + resolution + resolvedAt write should own a canonical engine audit row. Calling this tool today returns precondition_failed.',
  inputSchema: z.object({
    ticketId: z.string().uuid(),
    resolution: z.string().min(1).max(2_000),
    status: z.enum(['resolved', 'wont_fix']).optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async () => {
    throw new ToolError(
      'precondition_failed',
      'support_ticket_close is deferred to Phase 2 — closeSupportTicket helper not yet extracted to platform/',
    );
  },
};

export const supportTicketLinkTenantTool: ToolDefinition = {
  name: 'support_ticket_link_tenant',
  description:
    'Attach an orphan support ticket (tenantId = null) to a tenant. DEFERRED to Phase 2 — re-routing a ticket is a security-sensitive write that should own a canonical engine audit row; no `linkSupportTicketTenant` helper exists yet. Calling this tool today returns precondition_failed.',
  inputSchema: z.object({
    ticketId: z.string().uuid(),
    tenantId: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async () => {
    throw new ToolError(
      'precondition_failed',
      'support_ticket_link_tenant is deferred to Phase 2 — linkSupportTicketTenant helper not yet extracted to platform/',
    );
  },
};

/**
 * Tool registry.
 * `server.ts` spreads this array into the global tool list.
 */
export const supportTools: ToolDefinition[] = [
  supportTicketListTool,
  supportTicketGetTool,
  supportTicketAssignToMeTool,
  supportTicketCloseTool,
  supportTicketLinkTenantTool,
];
