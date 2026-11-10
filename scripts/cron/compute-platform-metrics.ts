#!/usr/bin/env tsx
/**
 * Nightly precompute of `PlatformMetricDaily` rows for the Super Admin
 * analytics page.
 *
 * Currently emits:
 *  - `engagement.dau` / `engagement.wau` / `engagement.mau` (top-line)
 *  - `funnel.signup` … `funnel.retained7d` (per-stage counts)
 *  - `addon.adoption.<addonKey>` (count of paying tenants with the addon)
 *
 * Idempotent via `upsert` keyed on `(day, key)`.
 *
 * Not wired to a cron platform in this commit — invoke manually with
 * `tsx scripts/cron/compute-platform-metrics.ts` or wire to Vercel Cron /
 * GitHub Actions in a follow-up.
 *
 * Usage:
 *   pnpm tsx scripts/cron/compute-platform-metrics.ts            # today
 *   pnpm tsx scripts/cron/compute-platform-metrics.ts 2026-05-12  # backfill
 */

import { withBypass } from '@/platform/db/tenant-context';
import { computeAddonAdoption } from '@/platform/super-admin/analytics/addon-adoption';
import { computeEngagement } from '@/platform/super-admin/analytics/engagement';
import { computeFunnel } from '@/platform/super-admin/analytics/funnel';
import type { Prisma } from '@prisma/client';

function dayUtc(input?: string): Date {
  const base = input ? new Date(`${input}T00:00:00Z`) : new Date();
  const d = new Date(base);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function upsertMetric(day: Date, key: string, value: number, tags?: Prisma.InputJsonValue) {
  await withBypass((tx) =>
    tx.platformMetricDaily.upsert({
      where: { day_key: { day, key } },
      create: { day, key, value, ...(tags ? { tags } : {}) },
      update: { value, ...(tags ? { tags } : {}) },
    }),
  );
}

async function main() {
  const arg = process.argv[2];
  const day = dayUtc(arg);
  const now = new Date(day);
  now.setUTCHours(23, 59, 59, 999);

  const [engagement, funnel, adoption] = await Promise.all([
    computeEngagement(now),
    computeFunnel(now),
    computeAddonAdoption(now),
  ]);

  await upsertMetric(day, 'engagement.dau', engagement.dau);
  await upsertMetric(day, 'engagement.wau', engagement.wau);
  await upsertMetric(day, 'engagement.mau', engagement.mau);

  await upsertMetric(day, 'funnel.signup', funnel.signup);
  await upsertMetric(day, 'funnel.onboarded', funnel.onboarded);
  await upsertMetric(day, 'funnel.first_invoice', funnel.firstInvoice);
  await upsertMetric(day, 'funnel.first_payment', funnel.firstPayment);
  await upsertMetric(day, 'funnel.retained_7d', funnel.retained7d);

  for (const row of adoption.rows) {
    await upsertMetric(day, `addon.adoption.${row.addonKey}`, row.pct, {
      enabled: row.enabled,
      total: row.total,
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[compute-platform-metrics] failed', err);
    process.exit(1);
  });
