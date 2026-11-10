// scripts/perf/measure-page.ts
//
// Auth + nav for one audit route. Returns a row of metrics. The runner
// orchestrates these calls and writes the report.
//
// AUTH STRATEGY
// -------------
// The audit needs an authenticated session against the local dev server.
// We assume the operator has set PERF_AUDIT_STORAGE_STATE=/path/to/state.json
// containing a previously-saved Clerk session (Playwright's storageState
// format). The companion `scripts/perf/login-once.ts` (Task 1.6) creates it.

import type { Browser, BrowserContext } from '@playwright/test';
import { type LighthouseRun, runLighthouseBoth } from './lighthouse-runner';
import type { PrismaLogCollector, QuerySample } from './prisma-log-collector';
import type { AuditRoute } from './routes';
import { SKIP_LOCALE_PREFIX } from './routes';

export type RouteMetrics = {
  route: AuditRoute;
  ttfbMs: number;
  domContentLoadedMs: number;
  loadMs: number;
  navigationOk: boolean;
  error?: string;
  prisma: QuerySample;
  lighthouse: LighthouseRun | null;
};

const BASE_URL = process.env.PERF_AUDIT_BASE_URL ?? 'http://localhost:3100';
const LOCALE = process.env.PERF_AUDIT_LOCALE ?? 'tr';

function resolveUrl(route: AuditRoute): string {
  if (SKIP_LOCALE_PREFIX.has(route.id)) return `${BASE_URL}${route.path}`;
  return `${BASE_URL}/${LOCALE}${route.path}`;
}

async function rewriteDynamicSegments(context: BrowserContext, url: string): Promise<string> {
  // Replace `__FIRST__` with the first row id pulled from the matching list.
  // We hit the list page first under the same authed context, parse the first
  // anchor pointing to `/<entity>/<id>`, and substitute the id.
  if (!url.includes('__FIRST__')) return url;
  const listUrl = url.replace('/__FIRST__', '');
  const probe = await context.newPage();
  try {
    await probe.goto(listUrl, { waitUntil: 'networkidle', timeout: 30_000 });
    const href = await probe
      .locator('a[href*="/documents/"][href$=""]')
      .first()
      .getAttribute('href');
    if (!href) throw new Error(`No invoice row anchor on ${listUrl}`);
    const match = /\/documents\/[^/]+\/([^/?#]+)$/.exec(href);
    const firstId = match?.[1];
    if (!firstId) throw new Error(`Unexpected anchor shape: ${href}`);
    return url.replace('__FIRST__', firstId);
  } finally {
    await probe.close();
  }
}

export async function measureRoute(
  browser: Browser,
  collector: PrismaLogCollector,
  route: AuditRoute,
): Promise<RouteMetrics> {
  const storageState = process.env.PERF_AUDIT_STORAGE_STATE;
  if (!storageState) {
    throw new Error('PERF_AUDIT_STORAGE_STATE not set — run scripts/perf/login-once.ts first');
  }
  const context = await browser.newContext({ storageState });
  let url = resolveUrl(route);
  try {
    url = await rewriteDynamicSegments(context, url);
  } catch (err) {
    await context.close();
    return {
      route,
      ttfbMs: 0,
      domContentLoadedMs: 0,
      loadMs: 0,
      navigationOk: false,
      error: (err as Error).message,
      prisma: { count: 0, slowestMs: 0, slowestSql: '' },
      lighthouse: null,
    };
  }

  const page = await context.newPage();
  collector.mark();
  const navStart = Date.now();
  let navigationOk = false;
  let error: string | undefined;
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    navigationOk = !!response && response.ok();
  } catch (err) {
    error = (err as Error).message;
  }
  const loadMs = Date.now() - navStart;
  const timing = await page.evaluate(() => {
    const t = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    return {
      ttfb: t ? t.responseStart - t.requestStart : 0,
      dcl: t ? t.domContentLoadedEventEnd - t.startTime : 0,
    };
  });
  const prisma = collector.sample();
  await page.close();
  await context.close();

  let lighthouse: LighthouseRun | null = null;
  if (process.env.PERF_AUDIT_SKIP_LIGHTHOUSE !== '1') {
    try {
      lighthouse = await runLighthouseBoth(url);
    } catch (err) {
      console.warn(`[perf] lighthouse failed for ${route.id}:`, (err as Error).message);
    }
  }

  return {
    route,
    ttfbMs: Math.round(timing.ttfb),
    domContentLoadedMs: Math.round(timing.dcl),
    loadMs,
    navigationOk,
    error,
    prisma,
    lighthouse,
  };
}
