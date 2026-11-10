// scripts/perf/run-audit.ts
//
// Top-level orchestrator. Boots Prisma log collector (which itself manages
// the dev server when needed), boots Playwright Chromium, loops over routes,
// writes the markdown report.

import { chromium } from '@playwright/test';
import { type RouteMetrics, measureRoute } from './measure-page';
import { PrismaLogCollector } from './prisma-log-collector';
import { writeReport } from './report';
import { AUDIT_ROUTES } from './routes';

const TARGET = process.env.PERF_AUDIT_OUT ?? 'docs/perf-audit/2026-05-13.md';

async function main(): Promise<void> {
  const collector = new PrismaLogCollector();
  await collector.start();

  const browser = await chromium.launch({ headless: process.env.PERF_AUDIT_HEADLESS !== '0' });
  const results: RouteMetrics[] = [];
  try {
    for (const route of AUDIT_ROUTES) {
      console.log(`[perf] measuring ${route.id}`);
      const metrics = await measureRoute(browser, collector, route);
      results.push(metrics);
      console.log(
        `[perf] ${route.id}: ${metrics.prisma.count} queries, slowest ${metrics.prisma.slowestMs}ms, load ${metrics.loadMs}ms`,
      );
    }
  } finally {
    await browser.close();
    await collector.stop();
  }
  await writeReport(TARGET, results);
  console.log(`[perf] wrote ${TARGET}`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
