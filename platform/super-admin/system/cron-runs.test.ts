import { beforeEach, describe, expect, it, vi } from 'vitest';

const cronRunFindMany = vi.fn();
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ cronRun: { findMany: cronRunFindMany } }),
}));

import { listCronRuns, listKnownCrons } from './cron-runs';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listCronRuns', () => {
  it('returns rows with computed durationMs', async () => {
    const startedAt = new Date('2026-05-13T03:00:00.000Z');
    const finishedAt = new Date('2026-05-13T03:00:02.500Z');
    cronRunFindMany.mockResolvedValue([
      {
        id: 'r1',
        jobName: 'idempotency-cleanup',
        status: 'success',
        startedAt,
        finishedAt,
        output: 'cleaned 3',
        errorMessage: null,
      },
    ]);
    const rows = await listCronRuns(50);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.durationMs).toBe(2500);
  });

  it('returns null durationMs when run is still in flight', async () => {
    cronRunFindMany.mockResolvedValue([
      {
        id: 'r1',
        jobName: 'foo',
        status: 'running',
        startedAt: new Date(),
        finishedAt: null,
        output: null,
        errorMessage: null,
      },
    ]);
    const rows = await listCronRuns(50);
    expect(rows[0]?.durationMs).toBeNull();
  });
});

describe('listKnownCrons', () => {
  it('returns the configured cron schedule list with last-run join', async () => {
    cronRunFindMany.mockResolvedValue([
      {
        jobName: 'idempotency-cleanup',
        startedAt: new Date('2026-05-13T03:00:00.000Z'),
        status: 'success',
      },
      {
        jobName: 'idempotency-cleanup',
        startedAt: new Date('2026-05-12T03:00:00.000Z'),
        status: 'success',
      },
    ]);
    const crons = await listKnownCrons();
    expect(crons.length).toBeGreaterThan(0);
    const cleanup = crons.find((c) => c.jobName === 'idempotency-cleanup');
    expect(cleanup?.lastRunStatus).toBe('success');
    expect(cleanup?.lastRunAt?.toISOString()).toBe('2026-05-13T03:00:00.000Z');
  });

  it('returns null lastRun for jobs that have not run yet', async () => {
    cronRunFindMany.mockResolvedValue([]);
    const crons = await listKnownCrons();
    expect(crons.every((c) => c.lastRunAt === null)).toBe(true);
  });
});
