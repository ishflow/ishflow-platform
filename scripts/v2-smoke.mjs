import fs from 'node:fs/promises';
import path from 'node:path';
// V2 smoke test — visits every route, captures status/redirect/errors.
// Run: node /tmp/v2-smoke/smoke.mjs
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3100';
const ROUTES = (await fs.readFile('/tmp/v2-smoke/routes.txt', 'utf8')).trim().split('\n');
const OUT = '/tmp/v2-smoke/results.json';
const SHOTS = '/tmp/v2-smoke/shots';
await fs.mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// Single reusable page — navigates only, no open/close churn.
const page = await ctx.newPage();
const consoleErrors = [];
const pageErrors = [];
let currentConsoleSink = consoleErrors;
let currentErrorSink = pageErrors;
page.on('console', (msg) => {
  if (msg.type() === 'error') currentConsoleSink.push(msg.text().slice(0, 300));
});
page.on('pageerror', (err) => currentErrorSink.push(String(err).slice(0, 300)));

const results = [];
let i = 0;
for (const route of ROUTES) {
  i++;
  // Fresh sinks per route (rebind, listeners stay attached).
  const localConsole = [];
  const localErrors = [];
  currentConsoleSink = localConsole;
  currentErrorSink = localErrors;

  const url = BASE + route;
  let status = null;
  let finalUrl = null;
  let title = null;
  let h1 = null;
  let nav_error = null;
  const started = Date.now();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = resp ? resp.status() : null;
    finalUrl = page.url();
    title = await page.title().catch(() => null);
    h1 = await page.$eval('h1', (el) => el.textContent?.trim().slice(0, 80)).catch(() => null);
  } catch (e) {
    nav_error = String(e).slice(0, 300);
  }
  const took = Date.now() - started;

  const redirected = finalUrl && finalUrl !== url && !finalUrl.endsWith(route);
  const looksLikeSignIn = finalUrl && /sign-in|signin|auth/.test(finalUrl);

  // Lightweight bucket inference
  let bucket;
  if (nav_error) bucket = 'nav_fail';
  else if (status >= 500) bucket = 'server_error';
  else if (status === 404) bucket = 'not_found';
  else if (pageErrors.length > 0) bucket = 'page_error';
  else if (looksLikeSignIn) bucket = 'auth_redirect';
  else if (redirected) bucket = 'redirect';
  else if (consoleErrors.length > 0) bucket = 'console_error';
  else if (!h1 && !title) bucket = 'empty';
  else bucket = 'ok';

  // Screenshot EVERY route for visual review.
  {
    const safe = route.replace(/[/]/g, '_').replace(/^_/, '') || 'root';
    const shotPath = path.join(SHOTS, `${safe}.png`);
    try {
      await page.screenshot({ path: shotPath, fullPage: false });
    } catch {}
  }

  results.push({
    i,
    route,
    status,
    finalUrl,
    redirected,
    title,
    h1,
    bucket,
    consoleErrors: localConsole.slice(0, 3),
    pageErrors: localErrors.slice(0, 3),
    nav_error,
    took_ms: took,
  });

  // Progress line
  const tag = bucket === 'ok' ? '✓' : bucket === 'auth_redirect' ? '↻' : '✗';
  process.stdout.write(
    `${tag} ${String(i).padStart(3)}/${ROUTES.length}  ${bucket.padEnd(14)} ${status ?? '---'}  ${route}\n`,
  );
}

await page.close();

await ctx.close();
await browser.close();

await fs.writeFile(OUT, JSON.stringify(results, null, 2));

// Summary
const groups = {};
for (const r of results) groups[r.bucket] = (groups[r.bucket] ?? 0) + 1;
console.log('\n=== SUMMARY ===');
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(15)} ${v}`);
}
console.log(`\nFull JSON: ${OUT}`);
console.log(`Screenshots (non-ok only): ${SHOTS}`);
