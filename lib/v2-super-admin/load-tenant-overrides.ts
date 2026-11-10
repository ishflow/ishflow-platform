import { withBypass } from '@/platform/db/tenant-context';

export interface SaFeatureKillView {
  featureKey: string;
  reason: string | null;
  killedAt: Date;
  killedByName: string | null;
}

export interface SaPriceOverrideView {
  monthlyPriceUsd: string;
  reason: string | null;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  createdByName: string | null;
}

export interface SaOverridesView {
  featureKills: SaFeatureKillView[];
  priceOverride: SaPriceOverrideView | null;
}

export async function loadSaTenantOverrides(tenantId: string): Promise<SaOverridesView> {
  return withBypass(async (tx) => {
    const [kills, price] = await Promise.all([
      tx.tenantFeatureKill.findMany({
        where: { tenantId },
        orderBy: { killedAt: 'desc' },
      }),
      tx.tenantPriceOverride.findUnique({ where: { tenantId } }),
    ]);

    const actorIds = new Set<string>();
    for (const k of kills) actorIds.add(k.killedBy);
    if (price) actorIds.add(price.createdBy);

    const users =
      actorIds.size > 0
        ? await tx.user.findMany({
            where: { id: { in: Array.from(actorIds) } },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : [];
    const nameById = new Map(
      users.map((u) => {
        const full = [u.firstName ?? '', u.lastName ?? ''].join(' ').trim();
        return [u.id, full.length > 0 ? full : u.email] as const;
      }),
    );

    return {
      featureKills: kills.map<SaFeatureKillView>((k) => ({
        featureKey: k.featureKey,
        reason: k.reason,
        killedAt: k.killedAt,
        killedByName: nameById.get(k.killedBy) ?? null,
      })),
      priceOverride: price
        ? {
            monthlyPriceUsd: price.monthlyPriceUsd.toString(),
            reason: price.reason,
            effectiveFrom: price.effectiveFrom,
            effectiveUntil: price.effectiveUntil,
            createdByName: nameById.get(price.createdBy) ?? null,
          }
        : null,
    };
  });
}
