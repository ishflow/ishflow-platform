import { withBypass } from '@/platform/db/tenant-context';
import { Prisma, type TenantFeatureKill, type TenantPriceOverride } from '@prisma/client';

/**
 * Read the price override row (one per tenant).
 */
export async function getTenantPriceOverride(
  tenantId: string,
): Promise<TenantPriceOverride | null> {
  return withBypass(async (tx) => {
    return tx.tenantPriceOverride.findUnique({ where: { tenantId } });
  });
}

export interface UpsertPriceOverrideInput {
  tenantId: string;
  monthlyPriceUsd: number;
  reason: string | null;
  effectiveUntil: Date | null;
  actorUserId: string;
  actorClerkId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function upsertTenantPriceOverride(
  input: UpsertPriceOverrideInput,
): Promise<TenantPriceOverride> {
  return withBypass(async (tx) => {
    const before = await tx.tenantPriceOverride.findUnique({
      where: { tenantId: input.tenantId },
    });

    const after = await tx.tenantPriceOverride.upsert({
      where: { tenantId: input.tenantId },
      create: {
        tenantId: input.tenantId,
        monthlyPriceUsd: new Prisma.Decimal(input.monthlyPriceUsd),
        reason: input.reason,
        effectiveUntil: input.effectiveUntil,
        createdBy: input.actorUserId,
      },
      update: {
        monthlyPriceUsd: new Prisma.Decimal(input.monthlyPriceUsd),
        reason: input.reason,
        effectiveUntil: input.effectiveUntil,
      },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: before ? 'tenant.price_override_updated' : 'tenant.price_override_added',
        tenantId: input.tenantId,
        before: before
          ? (JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        after: JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });

    return after;
  });
}

export interface DeletePriceOverrideInput {
  tenantId: string;
  actorClerkId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function deleteTenantPriceOverride(input: DeletePriceOverrideInput): Promise<void> {
  await withBypass(async (tx) => {
    const before = await tx.tenantPriceOverride.findUnique({
      where: { tenantId: input.tenantId },
    });
    if (!before) return;

    await tx.tenantPriceOverride.delete({ where: { tenantId: input.tenantId } });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.price_override_removed',
        tenantId: input.tenantId,
        before: JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue,
        after: Prisma.JsonNull,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  });
}

/**
 * List active feature kills for a tenant. Each row records a feature key
 * that has been disabled at the platform level for this tenant.
 */
export async function listTenantFeatureKills(tenantId: string): Promise<TenantFeatureKill[]> {
  return withBypass(async (tx) => {
    return tx.tenantFeatureKill.findMany({
      where: { tenantId },
      orderBy: { killedAt: 'desc' },
    });
  });
}

export interface AddFeatureKillInput {
  tenantId: string;
  featureKey: string;
  reason: string | null;
  actorUserId: string;
  actorClerkId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function addTenantFeatureKill(input: AddFeatureKillInput): Promise<TenantFeatureKill> {
  return withBypass(async (tx) => {
    const row = await tx.tenantFeatureKill.upsert({
      where: {
        tenantId_featureKey: {
          tenantId: input.tenantId,
          featureKey: input.featureKey,
        },
      },
      create: {
        tenantId: input.tenantId,
        featureKey: input.featureKey,
        reason: input.reason,
        killedBy: input.actorUserId,
      },
      update: {
        reason: input.reason,
        killedBy: input.actorUserId,
        killedAt: new Date(),
      },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.feature_killed',
        tenantId: input.tenantId,
        before: Prisma.JsonNull,
        after: {
          featureKey: row.featureKey,
          reason: row.reason,
        } as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });

    return row;
  });
}

export interface RemoveFeatureKillInput {
  tenantId: string;
  featureKey: string;
  actorClerkId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function removeTenantFeatureKill(input: RemoveFeatureKillInput): Promise<void> {
  await withBypass(async (tx) => {
    const before = await tx.tenantFeatureKill.findUnique({
      where: {
        tenantId_featureKey: {
          tenantId: input.tenantId,
          featureKey: input.featureKey,
        },
      },
    });
    if (!before) return;

    await tx.tenantFeatureKill.delete({
      where: {
        tenantId_featureKey: {
          tenantId: input.tenantId,
          featureKey: input.featureKey,
        },
      },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.feature_unkilled',
        tenantId: input.tenantId,
        before: {
          featureKey: before.featureKey,
          reason: before.reason,
        } as Prisma.InputJsonValue,
        after: Prisma.JsonNull,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  });
}
