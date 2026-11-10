/**
 * Addon adoption rate for the Super Admin analytics page.
 *
 * Denominator: paying tenants (plan ≠ free, status ∈ {active, trialing}).
 * Numerator: tenants with a non-expired `TenantAddon` row for the addon.
 */

import { withBypass } from '@/platform/db/tenant-context';

export interface AddonAdoptionRow {
  addonKey: string;
  enabled: number;
  total: number;
  pct: number;
}

export async function computeAddonAdoption(
  now: Date = new Date(),
): Promise<{ rows: AddonAdoptionRow[]; total: number }> {
  return withBypass(async (tx) => {
    const payingTenants = await tx.tenant.findMany({
      where: {
        deletedAt: null,
        plan: { not: 'free' },
        status: { in: ['active', 'trialing'] },
      },
      select: { id: true },
    });
    const total = payingTenants.length;
    const payingSet = new Set(payingTenants.map((t) => t.id));

    if (total === 0) return { rows: [], total };

    const addons = await tx.tenantAddon.findMany({
      where: {
        tenantId: { in: Array.from(payingSet) },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { tenantId: true, addonKey: true },
    });

    const enabledByAddon = new Map<string, Set<string>>();
    for (const a of addons) {
      let s = enabledByAddon.get(a.addonKey);
      if (!s) {
        s = new Set();
        enabledByAddon.set(a.addonKey, s);
      }
      s.add(a.tenantId);
    }

    const rows: AddonAdoptionRow[] = Array.from(enabledByAddon.entries())
      .map(([addonKey, tenants]) => ({
        addonKey,
        enabled: tenants.size,
        total,
        pct: Math.round((tenants.size / total) * 1000) / 10,
      }))
      .sort((a, b) => b.pct - a.pct);

    return { rows, total };
  });
}
