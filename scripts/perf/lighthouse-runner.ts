// scripts/perf/lighthouse-runner.ts
//
// Programmatic Lighthouse runner. We launch a single headless Chrome,
// drive auth + nav with Playwright in `measure-page`, then point
// Lighthouse at the already-warm port. Returns the two scores we care
// about (perf + LCP/CLS/TBT) for both `mobile` and `desktop` presets.

import { type LaunchedChrome, launch as launchChrome } from 'chrome-launcher';
import lighthouse from 'lighthouse';

export type LighthouseSummary = {
  performance: number; // 0..1
  lcpMs: number;
  clsScore: number;
  tbtMs: number;
};

export type LighthouseRun = {
  mobile: LighthouseSummary;
  desktop: LighthouseSummary;
};

async function runOne(
  url: string,
  port: number,
  preset: 'mobile' | 'desktop',
): Promise<LighthouseSummary> {
  const flags = {
    port,
    output: 'json' as const,
    onlyCategories: ['performance'],
    formFactor: preset,
    screenEmulation:
      preset === 'mobile'
        ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false }
        : { mobile: false, width: 1366, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling:
      preset === 'mobile'
        ? { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 }
        : { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
  };
  const result = await lighthouse(url, flags);
  if (!result) {
    throw new Error(`Lighthouse returned nothing for ${url}`);
  }
  const lhr = result.lhr;
  return {
    performance: lhr.categories.performance?.score ?? 0,
    lcpMs: lhr.audits['largest-contentful-paint']?.numericValue ?? 0,
    clsScore: lhr.audits['cumulative-layout-shift']?.numericValue ?? 0,
    tbtMs: lhr.audits['total-blocking-time']?.numericValue ?? 0,
  };
}

export async function runLighthouseBoth(url: string): Promise<LighthouseRun> {
  const chrome: LaunchedChrome = await launchChrome({
    chromeFlags: ['--headless=new', '--no-sandbox'],
  });
  try {
    const mobile = await runOne(url, chrome.port, 'mobile');
    const desktop = await runOne(url, chrome.port, 'desktop');
    return { mobile, desktop };
  } finally {
    await chrome.kill();
  }
}
