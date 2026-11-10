// scripts/perf/login-once.ts
//
// One-shot: opens a headed Chromium so the operator can sign in to Clerk
// dev with their owner-role account, then saves storageState to disk.
// The audit runner reads PERF_AUDIT_STORAGE_STATE to reuse the session.
//
// Run with: pnpm tsx scripts/perf/login-once.ts
//
// PERF_AUDIT_STORAGE_STATE=/path/to/state.json
// PERF_AUDIT_BASE_URL=http://localhost:3100
//
// If PERF_AUDIT_HEADLESS=1, runs headless (only useful with stored creds).

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';

const BASE = process.env.PERF_AUDIT_BASE_URL ?? 'http://localhost:3100';
const STATE = process.env.PERF_AUDIT_STORAGE_STATE ?? '.perf-audit/storage-state.json';

async function main() {
  const browser = await chromium.launch({ headless: process.env.PERF_AUDIT_HEADLESS === '1' });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/tr/sign-in`);
  console.log('[perf] sign in as owner user, then press ENTER in this terminal...');
  await new Promise<void>((resolve) => process.stdin.once('data', () => resolve()));
  await mkdir(dirname(STATE), { recursive: true });
  await context.storageState({ path: STATE });
  await writeFile(`${STATE}.touched-at`, new Date().toISOString(), 'utf-8');
  console.log(`[perf] saved ${STATE}`);
  await browser.close();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
