import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

type PgRoleRow = { rolsuper: boolean; rolbypassrls: boolean };

/**
 * Thrown when the runtime DB role is *verified* to bypass RLS (rolsuper or
 * rolbypassrls). This is a genuine security misconfiguration — distinct from a
 * transient inability to *run* the check (e.g. a connection-pool timeout on
 * cold start), which throws a plain Prisma error instead. Callers gate the
 * fail-closed `process.exit(1)` on this type so an infra blip never kills the
 * process.
 */
export class UnsafeDbRoleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeDbRoleError';
  }
}

/**
 * Fail-fast check: the runtime DB role must not bypass RLS.
 *
 * A role with `rolsuper = true` or `rolbypassrls = true` silently ignores
 * every ROW LEVEL SECURITY policy, including ones marked `FORCE`. If this
 * check fails, tenant isolation is NOT enforced on the current connection
 * and the process must refuse to serve traffic.
 *
 * Throws `UnsafeDbRoleError` only when the role is verified unsafe. If the
 * underlying `$queryRaw` itself fails (connection pool timeout, init error),
 * that error propagates unchanged — the role is *unknown*, not proven unsafe.
 */
export async function assertRuntimeRoleSafe(client: PrismaClient): Promise<void> {
  const rows = await client.$queryRaw<PgRoleRow[]>(
    Prisma.sql`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
  );
  const row = rows[0];
  if (!row) {
    throw new UnsafeDbRoleError(
      'assertRuntimeRoleSafe: pg_roles lookup returned no rows for current_user',
    );
  }
  if (row.rolsuper) {
    throw new UnsafeDbRoleError(
      'UNSAFE DB ROLE: current_user has rolsuper=true. DATABASE_URL must use a role with NOSUPERUSER NOBYPASSRLS. Refusing to start.',
    );
  }
  if (row.rolbypassrls) {
    throw new UnsafeDbRoleError(
      'UNSAFE DB ROLE: current_user has rolbypassrls=true. DATABASE_URL must use a role with NOBYPASSRLS. Refusing to start.',
    );
  }
}

interface VerifyRuntimeRoleOptions {
  /**
   * Invoked exactly once when the role is *verified* unsafe. The server wires
   * this to `process.exit(1)` in production (fail closed). It must NOT be
   * called for transient/unverifiable failures.
   */
  onUnsafe: (err: UnsafeDbRoleError) => void;
  /**
   * Invoked when every attempt failed for a non-security reason (the role
   * could not be verified — e.g. the DB was briefly unreachable). The check
   * resolves anyway so a cold-start connection blip does not turn into a hard
   * 500 for every concurrent request; RLS is still enforced per-connection and
   * the next cold start re-runs the check.
   */
  onUnverified?: (err: unknown) => void;
  /** Total attempts before giving up on transient errors. */
  attempts?: number;
  /** Override for tests — defaults to a real backoff sleep. */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Resilient wrapper around {@link assertRuntimeRoleSafe}.
 *
 * - Verified unsafe role  → `onUnsafe(err)` then re-throw (fail closed).
 * - Transient DB failure  → retry with backoff; if all attempts fail, call
 *   `onUnverified(err)` and resolve (do not crash — the role is unknown, not
 *   proven unsafe, and crashing turns a slow connection into a cascading 500).
 *
 * The previous implementation conflated these two cases and called
 * `process.exit(1)` on *any* failure, so a single cold-start connection-pool
 * timeout killed the whole serverless process.
 */
export async function verifyRuntimeRoleSafe(
  client: PrismaClient,
  opts: VerifyRuntimeRoleOptions,
): Promise<void> {
  const attempts = opts.attempts ?? 3;
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await assertRuntimeRoleSafe(client);
      return;
    } catch (err) {
      if (err instanceof UnsafeDbRoleError) {
        opts.onUnsafe(err);
        throw err;
      }
      if (attempt < attempts) {
        await sleep(attempt * 250);
        continue;
      }
      opts.onUnverified?.(err);
      return;
    }
  }
}
