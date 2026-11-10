import { withBypass } from '@/platform/db/tenant-context';
import { type AddonKey, isAddonKey } from './catalog';

/**
 * Returns the set of currently-enabled addons for a tenant. "Enabled" means
 * a row exists in `tenant_addon` AND its `expires_at` is null or in the
 * future.
 *
 * Defensive: rows whose `addon_key` is not in the current catalog are
 * silently dropped, so retiring an addon from the catalog cannot poison a
 * live AppContext.
 *
 * Runs via withBypass so the loader works from any caller (route handlers,
 * tests, super-admin code) without needing a tenant-set client.
 */
export async function loadEnabledAddons(tenantId: string): Promise<Set<AddonKey>> {
  const rows = await withBypass(async (tx) =>
    tx.tenantAddon.findMany({
      where: {
        tenantId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { addonKey: true },
    }),
  );
  const result = new Set<AddonKey>();
  for (const row of rows) {
    if (isAddonKey(row.addonKey)) {
      result.add(row.addonKey);
    }
  }
  return result;
}
