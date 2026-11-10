import { withBypass } from '@/platform/db/tenant-context';
import type { Prisma, Tenant, TenantPlan } from '@prisma/client';

// Single billing currency: USD. The tenant's operational `currency` is shown
// elsewhere for display, but MRR is the plan's USD monthly price — never
// converted. Numbers kept in lock step with `platform/billing/stripe-prices.ts`.
const PLAN_USD_PER_MONTH: Record<TenantPlan, number> = {
  free: 0,
  starter: 19,
  pro: 49,
  business: 149,
  enterprise: 499,
};

export interface TenantOverview {
  tenant: Tenant;
  ownerCount: number;
  totalDocs: number;
  mrrUsd: number;
}

export interface TenantUserRow {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  joinedAt: Date;
}

export interface TenantDocumentRow {
  id: string;
  type: string;
  number: string;
  date: Date;
  status: string;
  total: number;
  createdAt: Date;
}

export interface TenantDocumentsOpts {
  type?: string;
  limit?: number;
  cursor?: string;
}

export interface TenantDocumentsResult {
  rows: TenantDocumentRow[];
  nextCursor: string | null;
}

export interface TenantActivityRow {
  id: string;
  userId: string | null;
  userEmail: string | null;
  entity: string;
  entityId: string;
  action: string;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
  createdAt: Date;
}

export interface TenantActivityOpts {
  limit?: number;
  cursor?: string;
}

export interface TenantActivityResult {
  rows: TenantActivityRow[];
  nextCursor: string | null;
}

export interface TenantDebugTableCount {
  table: string;
  rowCount: number;
  sizeBytes: number;
}

export interface TenantDebug {
  tables: TenantDebugTableCount[];
  totalBytes: number;
  membershipCount: number;
}

const DOCUMENT_TABLES: ReadonlyArray<{ type: string; table: string }> = [
  { type: 'sales_invoice', table: 'document_sales_invoice' },
  { type: 'purchases_invoice', table: 'document_purchases_invoice' },
  { type: 'sales_payment_received', table: 'document_sales_payment_received' },
  { type: 'purchases_payment_sent', table: 'document_purchases_payment_sent' },
];

/**
 * Overview tile for the tenant detail page. Aggregates plan/status,
 * owner count (memberships with the `owner` system role), total
 * document count across the canonical Document_* tables, and MRR
 * in USD for this single tenant.
 */
export async function getTenantOverview(id: string): Promise<TenantOverview | null> {
  return withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id } });
    if (!tenant) return null;

    const ownerCount = await tx.membership.count({
      where: {
        tenantId: id,
        roles: { some: { name: 'owner', isSystem: true } },
      },
    });

    const counts = await Promise.all(
      DOCUMENT_TABLES.map(async ({ table }) => {
        const rows = await tx.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*)::bigint AS count FROM ${table} WHERE tenant_id = $1::uuid AND deleted_at IS NULL`,
          id,
        );
        return Number(rows[0]?.count ?? 0n);
      }),
    );
    const totalDocs = counts.reduce((sum, n) => sum + n, 0);

    const mrrUsd = tenant.status === 'active' ? PLAN_USD_PER_MONTH[tenant.plan as TenantPlan] : 0;

    return { tenant, ownerCount, totalDocs, mrrUsd };
  });
}

/**
 * Memberships for a tenant joined with the user record and role names.
 * Ordered most-recent-joined first.
 */
export async function getTenantUsers(id: string): Promise<TenantUserRow[]> {
  return withBypass(async (tx) => {
    const memberships = await tx.membership.findMany({
      where: { tenantId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        roles: { select: { name: true } },
      },
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      roles: m.roles.map((r) => r.name),
      joinedAt: m.createdAt,
    }));
  });
}

/**
 * Latest documents across the four canonical Document_* tables (sales
 * invoice, purchase invoice, sales payment received, purchase payment
 * sent). The line totals are aggregated for invoices; payment docs
 * carry `amount` directly on the header.
 *
 * Filter via `opts.type` (string match against the `type` field).
 * Cursor pagination by composite `createdAt|id` key.
 */
export async function getTenantDocuments(
  id: string,
  opts: TenantDocumentsOpts = {},
): Promise<TenantDocumentsResult> {
  const limit = Math.min(opts.limit ?? 100, 200);
  const typeFilter = opts.type;

  return withBypass(async (tx) => {
    const enabled = typeFilter
      ? DOCUMENT_TABLES.filter((t) => t.type === typeFilter)
      : DOCUMENT_TABLES;

    const pieces = await Promise.all(
      enabled.map(async ({ type, table }) => {
        // Sales/purchase invoices: total = SUM(quantity*price) from line table.
        // Payment docs: total = amount column.
        const lineTable =
          type === 'sales_invoice'
            ? 'document_line_sales_invoice_items'
            : type === 'purchases_invoice'
              ? 'document_line_purchases_invoice_items'
              : null;

        if (lineTable) {
          const rows = await tx.$queryRawUnsafe<
            Array<{
              id: string;
              number: string;
              date: Date;
              status: string;
              created_at: Date;
              total: string | null;
            }>
          >(
            `SELECT d.id, d.number, d.date, d.status, d.created_at,
                    COALESCE(SUM(l.quantity * l.price), 0)::text AS total
             FROM ${table} d
             LEFT JOIN ${lineTable} l
               ON l.document_id = d.id AND l.tenant_id = d.tenant_id
             WHERE d.tenant_id = $1::uuid AND d.deleted_at IS NULL
             GROUP BY d.id
             ORDER BY d.created_at DESC
             LIMIT ${limit + 1}`,
            id,
          );
          return rows.map((r) => ({
            id: r.id,
            type,
            number: r.number,
            date: r.date,
            status: r.status,
            total: Number(r.total ?? 0),
            createdAt: r.created_at,
          }));
        }

        // Payment docs — header carries amount directly.
        const rows = await tx.$queryRawUnsafe<
          Array<{
            id: string;
            number: string;
            date: Date;
            status: string;
            created_at: Date;
            amount: string;
          }>
        >(
          `SELECT id, number, date, status, created_at, amount::text AS amount
           FROM ${table}
           WHERE tenant_id = $1::uuid AND deleted_at IS NULL
           ORDER BY created_at DESC
           LIMIT ${limit + 1}`,
          id,
        );
        return rows.map((r) => ({
          id: r.id,
          type,
          number: r.number,
          date: r.date,
          status: r.status,
          total: Number(r.amount ?? 0),
          createdAt: r.created_at,
        }));
      }),
    );

    const merged = pieces.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const hasMore = merged.length > limit;
    const rows = merged.slice(0, limit);
    const tail = rows[rows.length - 1];
    const nextCursor = hasMore && tail ? tail.id : null;

    return { rows, nextCursor };
  });
}

/**
 * Audit log rows for one tenant, joined with the actor user's email when
 * available. Ordered by `createdAt` desc.
 */
export async function getTenantActivity(
  id: string,
  opts: TenantActivityOpts = {},
): Promise<TenantActivityResult> {
  const limit = Math.min(opts.limit ?? 100, 500);

  return withBypass(async (tx) => {
    const logs = await tx.auditLog.findMany({
      where: { tenantId: id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      include: {
        user: { select: { email: true } },
      },
    });

    const hasMore = logs.length > limit;
    const rows: TenantActivityRow[] = logs.slice(0, limit).map((l) => ({
      id: l.id,
      userId: l.userId,
      userEmail: l.user?.email ?? null,
      entity: l.entity,
      entityId: l.entityId,
      action: l.action,
      before: l.before,
      after: l.after,
      createdAt: l.createdAt,
    }));
    const tail = rows[rows.length - 1];
    const nextCursor = hasMore && tail ? tail.id : null;
    return { rows, nextCursor };
  });
}

/**
 * Debug-tab payload. Per-table row counts + on-disk size for every
 * `catalog_*` and `document_*` table that holds tenant-scoped data,
 * plus the membership count for the tenant.
 *
 * Counts use a single information_schema lookup followed by
 * one-COUNT-per-table query. Costs are bounded — Catalog_* and
 * Document_* combined are O(20) tables.
 */
export async function getTenantDebug(id: string): Promise<TenantDebug> {
  return withBypass(async (tx) => {
    const tableRows = await tx.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND (table_name LIKE 'catalog_%' OR table_name LIKE 'document_%')
       ORDER BY table_name`,
    );

    const tables: TenantDebugTableCount[] = [];
    let totalBytes = 0;

    for (const { table_name } of tableRows) {
      // Count rows for this tenant.
      let rowCount = 0;
      try {
        const result = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM ${table_name} WHERE tenant_id = $1::uuid`,
          id,
        );
        rowCount = Number(result[0]?.count ?? 0n);
      } catch {
        // Table may lack tenant_id (e.g., a global table inadvertently matching the prefix);
        // skip silently rather than poisoning the whole report.
        continue;
      }

      const sizeRow = await tx.$queryRawUnsafe<Array<{ size: bigint }>>(
        'SELECT pg_total_relation_size($1)::bigint AS size',
        table_name,
      );
      const sizeBytes = Number(sizeRow[0]?.size ?? 0n);
      totalBytes += sizeBytes;

      tables.push({ table: table_name, rowCount, sizeBytes });
    }

    const membershipCount = await tx.membership.count({ where: { tenantId: id } });

    return { tables, totalBytes, membershipCount };
  });
}
