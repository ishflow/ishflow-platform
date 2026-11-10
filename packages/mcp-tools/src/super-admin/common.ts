/**
 * Shared helpers for hand-written super-admin tool modules
 * (tenant-tools, and the upcoming user-tools, system-tools, audit-tools,
 * billing-tools, support-tools, demo-tools added in Tasks 10-11).
 *
 * Keep this file leaf-free of generated codegen helpers — those live in
 * `scripts/generate-mcp-tools/common.ts` and serve a different purpose
 * (string fragments emitted into generated files, not callable runtime
 * helpers).
 *
 * Audit pattern recap (mirrors the dual-audit pattern in the catalog /
 * document codegen tools):
 *   1. The wrapped engine action writes its canonical PlatformAuditLog row
 *      inside its own `withBypass` tx with the platform action name
 *      (e.g. `tenant.suspended`).
 *   2. `writeChannelAudit` layers a SECOND row with a `mcp.*` prefix and
 *      `source: 'mcp'` so the SA audit dashboard can attribute the change
 *      to the MCP delivery channel.
 *   3. `ctx.correlationId` is embedded in that channel row's `after` JSON
 *      payload so cross-channel investigation can link rows by correlationId
 *      without adding a dedicated column.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/platform/db';
import { ToolError } from '../error-map';
import type { McpToolContext } from '../types';

export interface Actor {
  /** Internal `User.id` — used for FK attribution on engine audit rows. */
  userId: string;
  /** Clerk subject id — used for the cross-tenant PlatformAuditLog row. */
  clerkId: string;
}

/**
 * Extract the user id + Clerk id from `ctx.appContext`. Throws
 * `internal_error` (NOT `forbidden` / `unauthorized`) when missing because
 * the per-tool scope check already passed — reaching here means a contract
 * violation between the route adapter and the tool layer, not an auth
 * failure that the caller can correct.
 *
 * The route adapter always forwards the real `AppContext` (which carries
 * both `id` and `clerkId`), so this guard catches drift early rather than
 * surfacing a confusing FK error from the engine action.
 */
export function requireActor(ctx: McpToolContext): Actor {
  const user = ctx.appContext?.user;
  if (!user?.id || !user?.clerkId) {
    throw new ToolError(
      'internal_error',
      'AppContext.user is missing id / clerkId — actor attribution impossible',
    );
  }
  return { userId: user.id, clerkId: user.clerkId };
}

export interface ChannelAuditInput {
  /** Engine action name without `mcp.` prefix — e.g. `tenant.suspended`. */
  action: string;
  /**
   * Tenant scope for the audit row.
   *
   * - Pass a UUID for any tool that targets a single tenant
   *   (`tenant.*` ops, most `user.*` ops scoped to a workspace, etc).
   * - Pass `null` for platform-level events with no tenant (system
   *   tools like `system.maintenance_enabled`, `system.api_key_revoked`,
   *   and user-scoped ops where the operator did not pick a workspace).
   *
   * `PlatformAuditLog.tenantId` is nullable in the schema, so a null
   * value persists as a true SQL NULL — `WHERE tenant_id IS NULL` will
   * surface these rows for platform-wide investigations.
   */
  tenantId: string | null;
  actor: Actor;
  /**
   * Channel-specific payload — folded into the persisted `after` JSON
   * alongside the auto-injected `correlationId`. Use a stable, narrow
   * shape (e.g. `{ reason }`, `{ newOwnerUserId }`) so audit consumers
   * can index on the keys.
   */
  details?: Record<string, unknown>;
  /** Per-call MCP context — read for correlationId. */
  ctx: McpToolContext;
}

/**
 * Write the channel-level PlatformAuditLog row that attributes the change
 * to the MCP delivery channel. Best-effort: failure is logged but never
 * thrown. The engine action wrote the canonical audit row already, so a
 * channel-audit hiccup loses only channel attribution — not the change
 * record itself.
 *
 * Correlation: `ctx.correlationId` is folded into the `after` JSON payload
 * so cross-channel investigation can link rows by correlationId without
 * a dedicated column.
 */
export async function writeChannelAudit({
  action,
  tenantId,
  actor,
  details,
  ctx,
}: ChannelAuditInput): Promise<void> {
  try {
    await prisma.platformAuditLog.create({
      data: {
        actorClerkId: actor.clerkId,
        action: `mcp.${action}`,
        tenantId,
        before: Prisma.JsonNull,
        after: {
          ...(details ?? { channel: 'mcp' }),
          correlationId: ctx.correlationId,
        } as Prisma.InputJsonValue,
        ip: null,
        userAgent: null,
        source: 'mcp',
      },
    });
  } catch (err) {
    // Channel attribution is not load-bearing; the engine row still
    // records the change. Log to stderr at warn level so prod monitoring
    // can surface persistent failures without paging.
    console.warn('[mcp] channel audit write failed', {
      action,
      tenantId,
      correlationId: ctx.correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
