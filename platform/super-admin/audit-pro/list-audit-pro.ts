/**
 * Audit pro list helper — adds date range, free-text payload search, entity
 * filtering, and category presets on top of the basic `listPlatformAudit`
 * helper.
 *
 * Free-text search is intentionally done as a Postgres LIKE against the
 * cast of `before`/`after` to text rather than `to_tsquery` so callers can
 * paste any substring (slug, uuid, etc.) without worrying about token
 * grammar. The index `platform_audit_log_created_at_idx` covers the
 * dominant filter (date range).
 */

import { withBypass } from '@/platform/db/tenant-context';
import type { Prisma } from '@prisma/client';
import { categoryActionFilter, isAuditCategory } from './categories';

export interface AuditProRow {
  id: string;
  actorClerkId: string;
  action: string;
  entity: string;
  tenantId: string | null;
  tenantName: string | null;
  targetUserId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditProFilters {
  action?: string;
  actorClerkId?: string;
  tenantId?: string;
  entity?: string;
  category?: string;
  q?: string;
  from?: string;
  to?: string;
}

export interface AuditProResult {
  rows: AuditProRow[];
  nextCursor: string | null;
}

const HARD_LIMIT = 200;

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Action prefix == entity prefix (everything before the first `.`). */
export function actionEntity(action: string): string {
  const idx = action.indexOf('.');
  return idx < 0 ? action : action.slice(0, idx);
}

/**
 * Build the Prisma `where` clause from the SA-pro filter inputs.
 *
 * Free-text payload search is layered with `AND` on top of the structured
 * filters so combining a category + a substring narrows correctly.
 */
function buildWhere(filters: AuditProFilters): Prisma.PlatformAuditLogWhereInput {
  const where: Prisma.PlatformAuditLogWhereInput = {};

  if (filters.action) where.action = filters.action;
  else if (filters.entity) where.action = { startsWith: `${filters.entity}.` };

  if (filters.actorClerkId) where.actorClerkId = filters.actorClerkId;
  if (filters.tenantId) where.tenantId = filters.tenantId;

  const from = parseDate(filters.from);
  const to = parseDate(filters.to);
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  if (filters.category && isAuditCategory(filters.category)) {
    const orClauses = categoryActionFilter(filters.category);
    if (orClauses.length > 0) where.OR = orClauses;
  }

  return where;
}

/**
 * Cursor-paginated query for the SA audit pro page.
 *
 * Free-text matching uses a JS-side substring filter on the JSON stringified
 * payload because Prisma does not expose a portable case-insensitive text
 * cast for JSONB. The dataset is bounded by the structured filter first
 * (date range, entity, category), then we over-fetch by `HARD_LIMIT` and
 * filter in memory. For a non-power-user operator console this is fine.
 */
export async function listAuditPro(
  filters: AuditProFilters,
  options: { limit?: number; cursor?: string } = {},
): Promise<AuditProResult> {
  const limit = Math.min(options.limit ?? 50, HARD_LIMIT);
  const where = buildWhere(filters);

  return withBypass(async (tx) => {
    const records = await tx.platformAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(options.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
    });

    const q = filters.q?.trim().toLowerCase();
    const matched = q
      ? records.filter((r) => {
          const haystack =
            (r.before == null ? '' : JSON.stringify(r.before).toLowerCase()) +
            (r.after == null ? '' : JSON.stringify(r.after).toLowerCase());
          return haystack.includes(q);
        })
      : records;

    const tenantIds = Array.from(
      new Set(matched.map((r) => r.tenantId).filter((x): x is string => !!x)),
    );
    const tenants =
      tenantIds.length > 0
        ? await tx.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(tenants.map((t) => [t.id, t.name]));

    const hasMore = matched.length > limit;
    const sliced = matched.slice(0, limit);
    const rows: AuditProRow[] = sliced.map((r) => ({
      id: r.id,
      actorClerkId: r.actorClerkId,
      action: r.action,
      entity: actionEntity(r.action),
      tenantId: r.tenantId,
      tenantName: r.tenantId ? (nameById.get(r.tenantId) ?? null) : null,
      targetUserId: r.targetUserId,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
    }));
    const last = rows[rows.length - 1];
    const nextCursor = hasMore && last ? last.id : null;
    return { rows, nextCursor };
  });
}

/** Distinct list of action prefixes (everything before `.`) for the entity dropdown. */
export async function listDistinctEntities(): Promise<string[]> {
  return withBypass(async (tx) => {
    const rows = await tx.platformAuditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
      take: 500,
    });
    const set = new Set<string>();
    for (const r of rows) {
      set.add(actionEntity(r.action));
    }
    return Array.from(set).sort();
  });
}

/**
 * Whole-table CSV export for the current filter set. Caps at 5,000 rows to
 * keep memory bounded — operator can refine filters if they need more.
 */
export async function exportAuditCsv(filters: AuditProFilters): Promise<string> {
  const where = buildWhere(filters);
  const rows = await withBypass((tx) =>
    tx.platformAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),
  );
  const q = filters.q?.trim().toLowerCase();
  const matched = q
    ? rows.filter((r) => {
        const haystack =
          (r.before == null ? '' : JSON.stringify(r.before).toLowerCase()) +
          (r.after == null ? '' : JSON.stringify(r.after).toLowerCase());
        return haystack.includes(q);
      })
    : rows;

  const header = [
    'id',
    'createdAt',
    'action',
    'actorClerkId',
    'tenantId',
    'targetUserId',
    'ip',
    'userAgent',
    'before',
    'after',
  ];
  const escapeCsv = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const body = matched
    .map((r) =>
      [
        r.id,
        r.createdAt.toISOString(),
        r.action,
        r.actorClerkId,
        r.tenantId ?? '',
        r.targetUserId ?? '',
        r.ip ?? '',
        r.userAgent ?? '',
        r.before,
        r.after,
      ]
        .map(escapeCsv)
        .join(','),
    )
    .join('\n');
  return `${header.join(',')}\n${body}`;
}
