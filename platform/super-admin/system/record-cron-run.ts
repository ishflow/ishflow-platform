/**
 * Telemetry wrapper for Vercel Cron handlers. Records a `CronRun` row so the
 * Super Admin → System page can show last-run / status / duration per job
 * (`listCronRuns` / `listKnownCrons` in `./cron-runs.ts`). Without this wrapper
 * the `cron_run` table is never written and that whole card stays empty.
 *
 * Writes go through the plain `prisma` client (NOT `withBypass`): `cron_run` is
 * a global table with no RLS policy, and keeping telemetry off the job's own
 * tenant-context transaction means a telemetry failure can never affect the
 * job. Every DB call here is best-effort — if it throws, the job still runs and
 * its real result/error is preserved.
 */
import { prisma } from '@/platform/db';

const OUTPUT_MAX = 2000;

function summarize(value: unknown): string | null {
  try {
    const json = JSON.stringify(value);
    if (!json) return null;
    return json.length > OUTPUT_MAX ? json.slice(0, OUTPUT_MAX) : json;
  } catch {
    return null;
  }
}

/**
 * Wrap a cron job's work. Inserts a `running` row on entry, then flips it to
 * `success` (with a short JSON summary of the return value) or `error` (with
 * the error message) on exit. Returns whatever `fn` returns; re-throws whatever
 * `fn` throws so the route's own error handling is unchanged.
 *
 * `jobName` MUST match the last path segment of the cron route (e.g.
 * `trial-expiry` for `/api/cron/trial-expiry`) so it joins to the schedule list.
 */
export async function recordCronRun<T>(jobName: string, fn: () => Promise<T>): Promise<T> {
  let runId: string | null = null;
  try {
    const run = await prisma.cronRun.create({
      data: { jobName, status: 'running' },
      select: { id: true },
    });
    runId = run.id;
  } catch {
    // Telemetry insert failed — run the job anyway.
    runId = null;
  }

  try {
    const result = await fn();
    if (runId) {
      try {
        await prisma.cronRun.update({
          where: { id: runId },
          data: { status: 'success', finishedAt: new Date(), output: summarize(result) },
        });
      } catch {
        // best-effort telemetry
      }
    }
    return result;
  } catch (err) {
    if (runId) {
      try {
        await prisma.cronRun.update({
          where: { id: runId },
          data: {
            status: 'error',
            finishedAt: new Date(),
            errorMessage: (err instanceof Error ? err.message : String(err)).slice(0, OUTPUT_MAX),
          },
        });
      } catch {
        // best-effort telemetry
      }
    }
    throw err;
  }
}
