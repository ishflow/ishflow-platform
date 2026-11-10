import fs from 'node:fs/promises';
import path from 'node:path';
// Re-test a subset of routes with longer timeout, headless.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3100';
const ROUTES = (await fs.readFile('/tmp/v2-smoke/retest.txt', 'utf8')).trim().split('\n');
const OUT = '/tmp/v2-smoke/retest-results.json';
const SHOTS = '/tmp/v2-smoke/shots';
await fs.mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const localConsole = [];
const localErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') localConsole.push(msg.text().slice(0, 300));
});
page.on('pageerror', (err) => localErrors.push(String(err).slice(0, 300)));

const results = [];
let i = 0;
for (const route of ROUTES) {
  i++;
  localConsole.length = 0;
  localErrors.length = 0;
  const url = BASE + route;
  let status = null,
    finalUrl = null,
    title = null,
    h1 = null,
    nav_error = null;
  const t0 = Date.now();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    status = resp ? resp.status() : null;
    finalUrl = page.url();
    title = await page.title().catch(() => null);
    h1 = await page.$eval('h1', (el) => el.textContent?.trim().slice(0, 80)).catch(() => null);
  } catch (e) {
    nav_error = String(e).slice(0, 300);
  }
  const took = Date.now() - t0;

  const redirected = finalUrl && finalUrl !== url && !finalUrl.endsWith(route);
  const looksLikeSignIn = finalUrl && /sign-in|signin|auth/.test(finalUrl);

  let bucket;
  if (nav_error) bucket = 'nav_fail';
  else if (status >= 500) bucket = 'server_error';
  else if (status === 404) bucket = 'not_found';
  else if (localErrors.length > 0) bucket = 'page_error';
  else if (looksLikeSignIn) bucket = 'auth_redirect';
  else if (redirected) bucket = 'redirect';
  else if (localConsole.length > 0) bucket = 'console_error';
  else if (!h1 && !title) bucket = 'empty';
  else bucket = 'ok';

  const safe = route.replace(/[/]/g, '_').replace(/^_/, '') || 'root';
  try {
    await page.screenshot({ path: path.join(SHOTS, `${safe}.png`), fullPage: false });
  } catch {}

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

  const tag = bucket === 'ok' ? '✓' : '✗';
  process.stdout.write(
    `${tag} ${String(i).padStart(2)}/${ROUTES.length}  ${bucket.padEnd(14)} ${status ?? '---'}  ${took}ms  ${route}\n`,
  );
}

await page.close();
await ctx.close();
await browser.close();
await fs.writeFile(OUT, JSON.stringify(results, null, 2));

const groups = {};
for (const r of results) groups[r.bucket] = (groups[r.bucket] ?? 0) + 1;
console.log('\n=== RETEST SUMMARY ===');
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1] - a[1]))
  console.log(`  ${k.padEnd(15)} ${v}`);
console.log(`Results: ${OUT}`);
