import { withBypass } from '@/platform/db/tenant-context';

/**
 * Reads every key with `enabled=true` from the global `feature_flag` table.
 * Kept separate from the pure `feature-flags.ts` so the nav builder can import
 * `featureEnabled` without pulling in the Prisma/tenant-context module.
 */
export async function loadEnabledFeatures(): Promise<Set<string>> {
  const rows = await withBypass((tx) =>
    tx.featureFlag.findMany({ where: { enabled: true }, select: { key: true } }),
  );
  return new Set(rows.map((r) => r.key));
}
