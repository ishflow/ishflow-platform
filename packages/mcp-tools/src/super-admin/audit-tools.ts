/**
 * Audit super-admin tools — hand-written MCP wrappers around
 * `platform/super-admin/list-platform-audit.ts`.
 *
 * All 2 tools require ApiKeyScope `platform_admin`. The MCP route's auth
 * floor is `read`; per-tool scope is enforced inside `dispatchTool` via
 * `requiredScope`. A read or write key naming any of these tools is
 * rejected with `forbidden` before the handler runs.
 *
 * Audit pattern:
 *   - Reads only (`audit_search`, `audit_get`) DO NOT write a channel
 *     audit row — they're observability calls and would otherwise spam the
 *     PlatformAuditLog table (and inflate the very table they query).
 *
 * Surface decisions:
 *   - `audit_search` exposes the engine's three native filters (action,
 *     actorClerkId, tenantId) plus the cursor pagination contract verbatim.
 *     The engine cap (limit ≤ 200) is mirrored here so an LLM cannot ask
 *     for an unbounded page.
 *   - `audit_get` returns the same PlatformAuditRow shape, joined with the
 *     tenant name when `tenantId` is set, and `null` when the id is unknown
 *     (matching the engine helper's null-return contract — no error).
 */
import {
  getPlatformAuditEntry,
  listPlatformAudit,
} from '@/platform/super-admin/list-platform-audit';
import { z } from 'zod';
import type { ToolDefinition } from '../types';

/* -------------------------------------------------------------------- */
/* Reads (2)                                                            */
/* -------------------------------------------------------------------- */

export const auditSearchTool: ToolDefinition = {
  name: 'audit_search',
  description:
    'Search platform-level PlatformAuditLog rows across all tenants. Filterable by exact `action` (e.g. `tenant.suspended`), `actorClerkId`, and `tenantId`. Cursor-paginated (limit defaults to 50, capped at 200). Sort: createdAt desc, with `id` as the cursor key. Returns { rows, nextCursor }.',
  inputSchema: z.object({
    action: z.string().min(1).max(120).optional(),
    actorClerkId: z.string().min(1).max(120).optional(),
    tenantId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).optional(),
    cursor: z.string().uuid().optional(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    return listPlatformAudit({
      action: input.action,
      actorClerkId: input.actorClerkId,
      tenantId: input.tenantId,
      limit: input.limit,
      cursor: input.cursor,
    });
  },
};

export const auditGetTool: ToolDefinition = {
  name: 'audit_get',
  description:
    'Fetch a single PlatformAuditLog entry by id, joined with the tenant name when tenantId is set. Returns null when the id is unknown (no error). Useful for drilling into a row surfaced by audit_search.',
  inputSchema: z.object({
    id: z.string().uuid(),
  }),
  requiredScope: 'platform_admin',
  handler: async (input) => {
    return getPlatformAuditEntry(input.id);
  },
};

/**
 * Tool registry.
 * `server.ts` spreads this array into the global tool list.
 */
export const auditTools: ToolDefinition[] = [auditSearchTool, auditGetTool];
