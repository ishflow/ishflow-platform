import { PrismaClient } from '@prisma/client';
import { verifyRuntimeRoleSafe } from './role-guard';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaReady: Promise<void> | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Resolves once the runtime role has been verified as non-privileged.
 * Scripts and server entry points should `await prismaReady` before
 * issuing queries. In the Next.js server runtime the check also runs
 * eagerly on module load.
 *
 * A *verified* unsafe role (rolsuper/rolbypassrls) hard-exits the process in
 * production so Vercel surfaces it in cold-start logs instead of serving
 * leaked data. A *transient* failure to run the check (e.g. a connection-pool
 * timeout on cold start) does NOT exit — the role is unknown, not proven
 * unsafe, and crashing would turn one slow connection into a cascading 500 for
 * every concurrent request on the instance. RLS is still enforced per
 * connection at the DB; the next cold start re-runs the check.
 *
 * Skipped when `SKIP_DB_ROLE_CHECK=1`, or during `next build`
 * (`NEXT_PHASE === 'phase-production-build'`) — build-time page-data
 * collection loads server modules but has no live DB; the guard is a
 * runtime-only concern and still runs on the serverless cold start.
 */
const shouldSkipRoleCheck =
  process.env.SKIP_DB_ROLE_CHECK === '1' || process.env.NEXT_PHASE === 'phase-production-build';

export const prismaReady: Promise<void> =
  globalForPrisma.prismaReady ??
  (shouldSkipRoleCheck
    ? Promise.resolve()
    : verifyRuntimeRoleSafe(prisma, {
        onUnsafe: (err) => {
          console.error('[platform/db] fatal role check failure:', err);
          if (process.env.NODE_ENV === 'production') {
            process.exit(1);
          }
        },
        onUnverified: (err) => {
          console.warn(
            '[platform/db] runtime role check could not complete (transient DB error); ' +
              'continuing this cold start without re-verification — RLS is still enforced per connection.',
            err,
          );
        },
      }));

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaReady = prismaReady;
}
