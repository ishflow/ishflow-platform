import fs from 'node:fs/promises';
// V2 test pass — auth bootstrap.
//
// Opens a headed Chromium, navigates to /sign-in, then pauses for manual Clerk
// sign-in. After the user resumes the inspector, the resulting cookies are
// persisted to /tmp/v2-test-pass/storage.json so later scripts can reuse the
// session without re-authenticating.
//
// Run: node scripts/v2-test-auth.mjs
import { chromium } from '@playwright/test';

const BASE = process.env.V2_BASE ?? 'http://localhost:3100';
const OUT = '/tmp/v2-test-pass';
const STORAGE = `${OUT}/storage.json`;

await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

console.log(`[auth] navigating ${BASE}/sign-in`);
await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });

console.log(
  '[auth] PAUSED — sign in manually with Clerk dev account, then click "Resume" in the Playwright Inspector.',
);
await page.pause();

// Wait for the post-sign-in redirect to settle on the V2 shell so the storage
// snapshot reflects the final session URL (not the intermediate /sign-in page).
try {
  await page.waitForURL(/v2\/(dashboard|onboarding)/, { timeout: 15_000 });
  console.log(`[auth] post-redirect URL: ${page.url()}`);
} catch {
  console.warn('[auth] post-redirect timed out — saving storage anyway');
}

// Resume callback — confirm we are signed in, then persist state.
const finalUrl = page.url();
console.log(`[auth] resumed — current URL: ${finalUrl}`);

await ctx.storageState({ path: STORAGE });
console.log(`[auth] storage state saved to ${STORAGE}`);

await ctx.close();
await browser.close();
