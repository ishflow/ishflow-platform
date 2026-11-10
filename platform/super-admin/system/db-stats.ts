/**
 * Postgres health snapshots for the Super Admin → System page.
 *
 * Every query is wrapped in try/catch so a permission-denied (e.g. Neon free
 * tier restrictions on `pg_stat_statements`) or extension-missing error
 * downgrades gracefully to an "unavailable" payload instead of crashing the
 * page.
 */
import { withBypass } from '@/platform/db/tenant-context';

export interface TableSizeRow {
  table: string;
  schema: string;
  bytes: number;
  rowEstimate: number;
}

export interface DbStats {
  available: boolean;
  totalBytes: number;
  topTables: TableSizeRow[];
  connectionCount: number;
  unavailableReason?: string;
}

export interface SlowQueryRow {
  query: string;
  calls: number;
  totalMs: number;
  meanMs: number;
}

export interface SlowQueriesResult {
  available: boolean;
  rows: SlowQueryRow[];
  /** Hint to surface to the operator when the extension isn't enabled. */
  reason?: string;
}

interface PgSizeRaw {
  schema_name: string;
  table_name: string;
  total_bytes: bigint | number;
  row_estimate: number;
}

interface PgTotalRaw {
  total_bytes: bigint | number;
}

interface PgConnRaw {
  count: bigint | number;
}

interface PgSlowRaw {
  query: string;
  calls: bigint | number;
  total_exec_time: number;
  mean_exec_time: number;
}

function toNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  return value;
}

export async function getDbStats(): Promise<DbStats> {
  try {
    const [tables, total, conn] = await withBypass(async (tx) => {
      const tablesRaw = await tx.$queryRawUnsafe<PgSizeRaw[]>(
        `SELECT n.nspname AS schema_name,
                c.relname AS table_name,
                pg_total_relation_size(c.oid) AS total_bytes,
                COALESCE(c.reltuples, 0)::bigint AS row_estimate
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind = 'r'
            AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          ORDER BY total_bytes DESC
          LIMIT 5`,
      );
      const totalRaw = await tx.$queryRawUnsafe<PgTotalRaw[]>(
        'SELECT pg_database_size(current_database())::bigint AS total_bytes',
      );
      const connRaw = await tx.$queryRawUnsafe<PgConnRaw[]>(
        'SELECT count(*)::bigint AS count FROM pg_stat_activity WHERE datname = current_database()',
      );
      return [tablesRaw, totalRaw, connRaw] as const;
    });

    return {
      available: true,
      totalBytes: toNumber(total[0]?.total_bytes),
      connectionCount: toNumber(conn[0]?.count),
      topTables: tables.map((r) => ({
        table: r.table_name,
        schema: r.schema_name,
        bytes: toNumber(r.total_bytes),
        rowEstimate: toNumber(r.row_estimate),
      })),
    };
  } catch (e) {
    return {
      available: false,
      totalBytes: 0,
      topTables: [],
      connectionCount: 0,
      unavailableReason: (e as Error).message,
    };
  }
}

export async function getSlowQueries(limit = 10): Promise<SlowQueriesResult> {
  try {
    const rows = await withBypass((tx) =>
      tx.$queryRawUnsafe<PgSlowRaw[]>(
        `SELECT query,
                calls,
                total_exec_time,
                mean_exec_time
           FROM pg_stat_statements
          WHERE query NOT ILIKE '%pg_stat_statements%'
          ORDER BY total_exec_time DESC
          LIMIT $1`,
        limit,
      ),
    );
    return {
      available: true,
      rows: rows.map((r) => ({
        query: r.query,
        calls: toNumber(r.calls),
        totalMs: r.total_exec_time,
        meanMs: r.mean_exec_time,
      })),
    };
  } catch (e) {
    const message = (e as Error).message;
    const looksLikeMissing =
      message.includes('pg_stat_statements') ||
      message.includes('does not exist') ||
      message.includes('permission denied');
    return {
      available: false,
      rows: [],
      reason: looksLikeMissing
        ? 'pg_stat_statements extension is not enabled or accessible'
        : message,
    };
  }
}
