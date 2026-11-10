import { ADDON_CATALOG, ADDON_KEYS, type AddonKey } from '@/platform/addons';
import { withBypass } from '@/platform/db/tenant-context';

export interface SaAddonView {
  key: AddonKey;
  status: 'ga' | 'beta' | 'planned';
  enabled: boolean;
  enabledAt: Date | null;
  enabledByName: string | null;
  expiresAt: Date | null;
  notes: string | null;
}

/**
 * Per-tenant addon entitlement view used by the V2 super-admin addons tab.
 * Returns one row per ADDON_KEY (12 entries) with enabled state + audit
 * metadata resolved into a display name.
 */
export async function loadSaTenantAddons(tenantId: string): Promise<SaAddonView[]> {
  return withBypass(async (tx) => {
    const rows = await tx.tenantAddon.findMany({ where: { tenantId } });
    const rowByKey = new Map(rows.map((r) => [r.addonKey, r] as const));

    const enabledByIds = Array.from(new Set(rows.map((r) => r.enabledBy)));
    const users =
      enabledByIds.length > 0
        ? await tx.user.findMany({
            where: { id: { in: enabledByIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : [];
    const nameById = new Map(
      users.map((u) => {
        const full = [u.firstName ?? '', u.lastName ?? ''].join(' ').trim();
        return [u.id, full.length > 0 ? full : u.email] as const;
      }),
    );

    return ADDON_KEYS.map<SaAddonView>((key) => {
      const row = rowByKey.get(key);
      return {
        key,
        status: ADDON_CATALOG[key].status,
        enabled: Boolean(row),
        enabledAt: row?.enabledAt ?? null,
        enabledByName: row ? (nameById.get(row.enabledBy) ?? null) : null,
        expiresAt: row?.expiresAt ?? null,
        notes: row?.notes ?? null,
      };
    });
  });
}
