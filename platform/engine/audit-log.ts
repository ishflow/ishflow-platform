import type { AppContext } from '@/platform/auth/current-context';
import { withBypass } from '@/platform/db/tenant-context';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'post'
  | 'unpost'
  | 'invite'
  | 'login'
  | 'api_create'
  | 'api_update'
  | 'api_delete'
  | 'api_post'
  | 'api_unpost';

/**
 * Surface that originated the audited mutation. Persisted to
 * `audit_log.source` so the dashboard can attribute writes back to their
 * delivery channel.
 *
 * - `web`    — Server Action / form submission from the Next.js UI
 * - `mobile` — native iOS / Android app via the v1 API
 * - `api_v1` — direct REST consumers of `/api/v1/*`
 * - `mcp`    — Anthropic MCP server tool dispatch (this server)
 */
export type AuditSource = 'web' | 'mobile' | 'api_v1' | 'mcp';

type AuditParams = {
  entity: string;
  entityId: string;
  action: AuditAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  source?: AuditSource;
  /**
   * Out-of-band metadata about the delivery channel (e.g. MCP correlationId).
   * Merged into the persisted `after` JSON under the `__meta` key so cross-
   * channel investigations can link rows by correlationId without a dedicated
   * column. Optional — omitted on the legacy web/mobile/api_v1 paths.
   *
   * Choosing `__meta` (double-underscore) over a bare key sidesteps collisions
   * with real entity fields; the entity snapshot stays a first-class citizen
   * at the top level of `after`.
   */
  metadata?: Record<string, unknown>;
};

/**
 * Write one audit entry. Runs in its OWN `withBypass` transaction — decoupled
 * from the caller's mutation tx so that an audit failure can never abort the
 * underlying mutation (e.g. FK violations on stale test contexts, transient
 * DB hiccups). Accepts a `tx` arg for signature compatibility but ignores it.
 *
 * Failures are logged to stderr and swallowed.
 */
export async function writeAudit(
  _tx: unknown,
  ctx: AppContext,
  params: AuditParams,
): Promise<void> {
  if (!ctx.tenant) return;
  const tenantId = ctx.tenant.id;
  const userId = ctx.user?.id ?? null;
  try {
    await withBypass(async (tx) => {
      // Verify the user actually exists — fake/test contexts may carry a UUID
      // that isn't in the User table, which would trigger a FK violation.
      let safeUserId: string | null = userId;
      if (safeUserId) {
        const u = (await tx.user.findUnique({ where: { id: safeUserId } })) as {
          id: string;
        } | null;
        if (!u) safeUserId = null;
      }
      // Merge optional out-of-band metadata into `after` under a reserved
      // `__meta` key. Two shapes are possible:
      //   - caller passed `after` (entity snapshot): becomes { ...after, __meta }
      //   - caller passed only metadata (e.g. document_post): becomes { __meta }
      // If neither is provided we pass undefined so the column stays NULL on
      // legacy callers.
      let afterPayload: Record<string, unknown> | undefined;
      if (params.metadata) {
        afterPayload = { ...(params.after ?? {}), __meta: params.metadata };
      } else if (params.after) {
        afterPayload = params.after;
      }
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: safeUserId,
          entity: params.entity,
          entityId: params.entityId,
          action: params.action,
          // JSON columns on Prisma want Prisma.InputJsonValue; our `before`/
          // `after` are record snapshots that may contain Dates — cast
          // through unknown so the compiler accepts arbitrary JSON-compatible
          // shapes. Failures surface as runtime errors and are swallowed.
          before: (params.before ?? undefined) as never,
          after: afterPayload as never,
          source: params.source ?? null,
        },
      });
    });
  } catch (error) {
    process.stderr.write(
      `writeAudit: failed for ${params.entity} ${params.entityId}: ${(error as Error).message}\n`,
    );
  }
}
