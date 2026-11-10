import { withBypass } from '@/platform/db/tenant-context';

/**
 * One row of the `platform_audit_log` table joined with the tenant name when
 * `tenantId` is set. Designed for rendering in the Super Admin audit viewer —
 * `before` / `after` remain `unknown` because the JSON shape depends on the
 * action and is rendered raw in the detail page.
 */
export interface PlatformAuditRow {
  id: string;
  actorClerkId: string;
  action: string;
  tenantId: string | null;
  tenantName: string | null;
  targetUserId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface ListPlatformAuditInput {
  action?: string;
  actorClerkId?: string;
  tenantId?: string;
  limit?: number;
  cursor?: string;
}

export interface ListPlatformAuditResult {
  rows: PlatformAuditRow[];
  nextCursor: string | null;
}

/**
 * List platform-level audit entries for the Super Admin console. Uses
 * `withBypass` because the operator UI lives outside any tenant context.
 *
 * Sort: `createdAt desc`, with `id` as the cursor key.
 */
export async function listPlatformAudit(
  input: ListPlatformAuditInput = {},
): Promise<ListPlatformAuditResult> {
  const limit = Math.min(input.limit ?? 50, 200);

  return withBypass(async (tx) => {
    const records = await tx.platformAuditLog.findMany({
      where: {
        ...(input.action ? { action: input.action } : {}),
        ...(input.actorClerkId ? { actorClerkId: input.actorClerkId } : {}),
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    });

    const tenantIds = Array.from(
      new Set(records.map((r) => r.tenantId).filter((x): x is string => !!x)),
    );
    const tenants =
      tenantIds.length > 0
        ? await tx.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(tenants.map((t) => [t.id, t.name]));

    const hasMore = records.length > limit;
    const rows: PlatformAuditRow[] = records.slice(0, limit).map((r) => ({
      id: r.id,
      actorClerkId: r.actorClerkId,
      action: r.action,
      tenantId: r.tenantId,
      tenantName: r.tenantId ? (nameById.get(r.tenantId) ?? null) : null,
      targetUserId: r.targetUserId,
      before: r.before,
      after: r.after,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
    }));
    const lastRow = rows[rows.length - 1];
    const nextCursor = hasMore && lastRow ? lastRow.id : null;
    return { rows, nextCursor };
  });
}

/**
 * Fetch a single platform audit entry by id, joined with its tenant name when
 * `tenantId` is set. Returns `null` when the entry does not exist.
 */
export async function getPlatformAuditEntry(id: string): Promise<PlatformAuditRow | null> {
  return withBypass(async (tx) => {
    const r = await tx.platformAuditLog.findUnique({ where: { id } });
    if (!r) return null;
    const tenant = r.tenantId
      ? await tx.tenant.findUnique({
          where: { id: r.tenantId },
          select: { name: true },
        })
      : null;
    return {
      id: r.id,
      actorClerkId: r.actorClerkId,
      action: r.action,
      tenantId: r.tenantId,
      tenantName: tenant?.name ?? null,
      targetUserId: r.targetUserId,
      before: r.before,
      after: r.after,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
    };
  });
}
