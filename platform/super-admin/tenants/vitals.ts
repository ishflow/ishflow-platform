import { withBypass } from '@/platform/db/tenant-context';

export type VitalsWindow = 30 | 90 | 365;

export interface DocCountPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface TopRow {
  id: string;
  name: string;
  total: number;
}

export interface TenantVitals {
  window: VitalsWindow;
  docCounts: DocCountPoint[];
  userCount: number;
  accountsReceivable: number;
  topCustomers: TopRow[];
  topProducts: TopRow[];
  errorRate: number;
  /** Total docs in the window (sum of `docCounts`). */
  totalDocs: number;
}

const DOC_TABLES: ReadonlyArray<string> = [
  'document_sales_invoice',
  'document_purchases_invoice',
  'document_sales_payment_received',
  'document_purchases_payment_sent',
];

/**
 * Aggregate tenant health vitals for the SA Vitals tab.
 *
 * - `docCounts`: per-day document creation count across all canonical
 *   Document_* tables for the chosen window (30 / 90 / 365 days).
 * - `userCount`: count of `membership` rows for this tenant.
 * - `accountsReceivable`: net AR balance from `movement_sales_accounts_receivable`
 *   (active rows; `income` adds debt, settlements subtract); 0 when no open AR.
 * - `topCustomers` / `topProducts`: top 5 by SUM(line.quantity * line.price)
 *   from sales invoice lines in the window.
 * - `errorRate`: count of `platform_audit_log` rows with `action`
 *   ending in `.failed` over the window — proxy for tenant-level failures.
 */
export async function getTenantVitals(
  tenantId: string,
  window: VitalsWindow = 30,
): Promise<TenantVitals> {
  return withBypass(async (tx) => {
    const since = new Date(Date.now() - window * 24 * 60 * 60 * 1000);

    // Per-day doc creation counts merged across the four document tables.
    const dailyMap = new Map<string, number>();
    for (const table of DOC_TABLES) {
      try {
        const rows = await tx.$queryRawUnsafe<Array<{ d: Date; c: bigint }>>(
          `SELECT date_trunc('day', created_at)::date AS d, COUNT(*)::bigint AS c
           FROM ${table}
           WHERE tenant_id = $1::uuid AND deleted_at IS NULL AND created_at >= $2
           GROUP BY 1
           ORDER BY 1`,
          tenantId,
          since,
        );
        for (const r of rows) {
          const key = r.d.toISOString().slice(0, 10);
          dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(r.c ?? 0n));
        }
      } catch {
        // Table missing in some envs — skip silently.
      }
    }
    const docCounts: DocCountPoint[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
    const totalDocs = docCounts.reduce((sum, p) => sum + p.count, 0);

    const userCount = await tx.membership.count({ where: { tenantId } });

    // Accounts receivable balance: net of active AR register rows. `income`
    // rows add debt; settlement rows (payments) carry the opposite sign — see
    // `platform/engine/posted-balance-by-doc.ts` for the same convention.
    let accountsReceivable = 0;
    try {
      const arRows = await tx.$queryRawUnsafe<Array<{ total: string | null }>>(
        `SELECT COALESCE(SUM(CASE WHEN kind = 'income' THEN amount ELSE -amount END), 0)::text AS total
         FROM movement_sales_accounts_receivable
         WHERE tenant_id = $1::uuid AND active = true`,
        tenantId,
      );
      accountsReceivable = Number(arRows[0]?.total ?? 0);
    } catch {
      accountsReceivable = 0;
    }

    // Top customers + products via sales invoice lines.
    let topCustomers: TopRow[] = [];
    try {
      const rows = await tx.$queryRawUnsafe<
        Array<{ id: string; name: string; total: string | null }>
      >(
        `SELECT c.id, c.name, COALESCE(SUM(l.quantity * l.price), 0)::text AS total
         FROM document_sales_invoice d
         JOIN document_line_sales_invoice_items l
           ON l.document_id = d.id AND l.tenant_id = d.tenant_id
         JOIN catalog_sales_customer c
           ON c.id = d.customer AND c.tenant_id = d.tenant_id
         WHERE d.tenant_id = $1::uuid
           AND d.deleted_at IS NULL
           AND d.created_at >= $2
         GROUP BY c.id, c.name
         ORDER BY 3 DESC
         LIMIT 5`,
        tenantId,
        since,
      );
      topCustomers = rows.map((r) => ({
        id: r.id,
        name: r.name,
        total: Number(r.total ?? 0),
      }));
    } catch {
      topCustomers = [];
    }

    let topProducts: TopRow[] = [];
    try {
      const rows = await tx.$queryRawUnsafe<
        Array<{ id: string; name: string; total: string | null }>
      >(
        `SELECT p.id, p.name, COALESCE(SUM(l.quantity * l.price), 0)::text AS total
         FROM document_sales_invoice d
         JOIN document_line_sales_invoice_items l
           ON l.document_id = d.id AND l.tenant_id = d.tenant_id
         JOIN catalog_inventory_product p
           ON p.id = l.product AND p.tenant_id = d.tenant_id
         WHERE d.tenant_id = $1::uuid
           AND d.deleted_at IS NULL
           AND d.created_at >= $2
         GROUP BY p.id, p.name
         ORDER BY 3 DESC
         LIMIT 5`,
        tenantId,
        since,
      );
      topProducts = rows.map((r) => ({
        id: r.id,
        name: r.name,
        total: Number(r.total ?? 0),
      }));
    } catch {
      topProducts = [];
    }

    let errorRate = 0;
    try {
      const errRows = await tx.$queryRawUnsafe<Array<{ c: bigint }>>(
        `SELECT COUNT(*)::bigint AS c
         FROM platform_audit_log
         WHERE tenant_id = $1::uuid
           AND action LIKE '%.failed'
           AND created_at >= $2`,
        tenantId,
        since,
      );
      errorRate = Number(errRows[0]?.c ?? 0n);
    } catch {
      errorRate = 0;
    }

    return {
      window,
      docCounts,
      userCount,
      accountsReceivable,
      topCustomers,
      topProducts,
      errorRate,
      totalDocs,
    };
  });
}
