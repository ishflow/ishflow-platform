// scripts/perf/prisma-log-collector.ts
//
// Subscribes to a child `next dev` process's stderr and counts emitted
// `prisma:query` lines between `mark()` calls. Used by the per-route runner
// to know how many queries a single page render emits.
//
// We rely on stderr (Next.js dev forwards Prisma's stderr unchanged when
// DEBUG=prisma:query is set). A line looks like:
//   prisma:query SELECT "tenantId" ... +0ms
// We don't try to parse the SQL — counting + slowest-row capture is enough
// for the audit.

import { type ChildProcessByStdio, spawn } from 'node:child_process';
import type { Readable } from 'node:stream';

type DevProc = ChildProcessByStdio<null, Readable, Readable>;

export type QuerySample = {
  count: number;
  slowestMs: number;
  slowestSql: string;
};

const PRISMA_QUERY_RE = /^prisma:query\s+(.*?)(?:\s+\+(\d+)ms)?$/;

export class PrismaLogCollector {
  private proc: DevProc | null = null;
  private buffer: { sql: string; ms: number }[] = [];
  private active = false;

  /**
   * Boots `pnpm dev` with `DEBUG=prisma:query` if it is not already running.
   * If `PERF_AUDIT_EXTERNAL_DEV=1` is set we skip spawning and assume the
   * caller is tailing logs themselves (Docker / pm2 / human-attended dev).
   */
  async start(): Promise<void> {
    if (process.env.PERF_AUDIT_EXTERNAL_DEV === '1') return;

    const proc = spawn('pnpm', ['dev'], {
      env: { ...process.env, DEBUG: 'prisma:query', PORT: '3100' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }) as DevProc;
    this.proc = proc;

    proc.stderr.setEncoding('utf-8');
    proc.stderr.on('data', (chunk: string) => {
      if (!this.active) return;
      for (const line of chunk.split('\n')) {
        const match = PRISMA_QUERY_RE.exec(line);
        if (!match) continue;
        this.buffer.push({ sql: match[1] ?? '', ms: Number(match[2] ?? '0') });
      }
    });

    // Wait for "Ready" line
    await new Promise<void>((resolve) => {
      proc.stdout.setEncoding('utf-8');
      const onReady = (chunk: string) => {
        if (chunk.includes('Ready') || chunk.includes('listening on')) {
          proc.stdout.off('data', onReady);
          resolve();
        }
      };
      proc.stdout.on('data', onReady);
    });
  }

  mark(): void {
    this.buffer = [];
    this.active = true;
  }

  sample(): QuerySample {
    this.active = false;
    const slowest = this.buffer.reduce<{ sql: string; ms: number }>(
      (best, cur) => (cur.ms > best.ms ? cur : best),
      { sql: '', ms: 0 },
    );
    return { count: this.buffer.length, slowestMs: slowest.ms, slowestSql: slowest.sql };
  }

  async stop(): Promise<void> {
    if (this.proc) {
      this.proc.kill('SIGTERM');
      this.proc = null;
    }
  }
}
