/**
 * Cron telemetry for the Super Admin → System page.
 *
 * - `listCronRuns()` — last N rows from `CronRun` newest-first.
 * - `listKnownCrons()` — schedule list. Read from `vercel.json` if present,
 *   otherwise fall back to a hardcoded list mirroring the current crons in
 *   the repo. Joined with the latest `CronRun` row per `jobName`.
 */
import fs from 'node:fs';
import path from 'node:path';

import { withBypass } from '@/platform/db/tenant-context';

export interface CronRunRow {
  id: string;
  jobName: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  output: string | null;
  errorMessage: string | null;
  durationMs: number | null;
}

export async function listCronRuns(limit = 50): Promise<CronRunRow[]> {
  return withBypass(async (tx) => {
    const rows = await tx.cronRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      jobName: r.jobName,
      status: r.status,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      output: r.output,
      errorMessage: r.errorMessage,
      durationMs:
        r.finishedAt && r.startedAt ? r.finishedAt.getTime() - r.startedAt.getTime() : null,
    }));
  });
}

export interface KnownCron {
  jobName: string;
  path: string;
  schedule: string;
  lastRunAt: Date | null;
  lastRunStatus: string | null;
}

interface VercelJsonShape {
  crons?: Array<{ path: string; schedule: string }>;
}

const FALLBACK_CRONS: ReadonlyArray<{ path: string; schedule: string }> = [
  { path: '/api/cron/idempotency-cleanup', schedule: '0 3 * * *' },
  { path: '/api/cron/auto-delete-archived', schedule: '0 4 * * *' },
  { path: '/api/cron/trial-expiry', schedule: '0 3 * * *' },
  { path: '/api/cron/trial-ending-soon', schedule: '0 9 * * *' },
  { path: '/api/cron/low-stock-check', schedule: '30 9 * * *' },
  { path: '/api/cron/overdue-payments', schedule: '0 10 * * *' },
];

function deriveJobName(cronPath: string): string {
  // /api/cron/foo-bar → foo-bar
  const parts = cronPath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? cronPath;
}

function readCronsFromVercelJson(): ReadonlyArray<{ path: string; schedule: string }> {
  try {
    const filePath = path.join(process.cwd(), 'vercel.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as VercelJsonShape;
    if (Array.isArray(parsed.crons) && parsed.crons.length > 0) return parsed.crons;
    return FALLBACK_CRONS;
  } catch {
    return FALLBACK_CRONS;
  }
}

export async function listKnownCrons(): Promise<KnownCron[]> {
  const crons = readCronsFromVercelJson();
  const jobNames = crons.map((c) => deriveJobName(c.path));

  // Latest run per job (single round trip).
  const latestRuns = await withBypass(async (tx) => {
    const rows = await tx.cronRun.findMany({
      where: { jobName: { in: jobNames } },
      orderBy: [{ jobName: 'asc' }, { startedAt: 'desc' }],
    });
    const byJob = new Map<string, { startedAt: Date; status: string }>();
    for (const row of rows) {
      if (!byJob.has(row.jobName)) {
        byJob.set(row.jobName, { startedAt: row.startedAt, status: row.status });
      }
    }
    return byJob;
  });

  return crons.map((c) => {
    const jobName = deriveJobName(c.path);
    const latest = latestRuns.get(jobName);
    return {
      jobName,
      path: c.path,
      schedule: c.schedule,
      lastRunAt: latest?.startedAt ?? null,
      lastRunStatus: latest?.status ?? null,
    };
  });
}
