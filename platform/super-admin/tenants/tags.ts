import { withBypass } from '@/platform/db/tenant-context';
import { Prisma, type TenantTag } from '@prisma/client';

/**
 * List tags for a tenant, sorted alphabetically by label.
 */
export async function listTenantTags(tenantId: string): Promise<TenantTag[]> {
  return withBypass(async (tx) => {
    return tx.tenantTag.findMany({
      where: { tenantId },
      orderBy: { label: 'asc' },
    });
  });
}

export interface CreateTenantTagInput {
  tenantId: string;
  label: string;
  color: string;
  actorUserId: string;
  actorClerkId: string;
  ip: string | null;
  userAgent: string | null;
}

/**
 * Create a tag for a tenant (idempotent on tenantId+label). Writes a
 * `tenant.tag_added` row to PlatformAuditLog with the new tag payload.
 */
export async function createTenantTag(input: CreateTenantTagInput): Promise<TenantTag> {
  return withBypass(async (tx) => {
    const tag = await tx.tenantTag.upsert({
      where: { tenantId_label: { tenantId: input.tenantId, label: input.label } },
      create: {
        tenantId: input.tenantId,
        label: input.label,
        color: input.color,
        createdBy: input.actorUserId,
      },
      update: { color: input.color },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.tag_added',
        tenantId: input.tenantId,
        before: Prisma.JsonNull,
        after: {
          label: tag.label,
          color: tag.color,
        } as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });

    return tag;
  });
}

export interface DeleteTenantTagInput {
  tenantId: string;
  tagId: string;
  actorClerkId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function deleteTenantTag(input: DeleteTenantTagInput): Promise<void> {
  await withBypass(async (tx) => {
    const before = await tx.tenantTag.findUnique({ where: { id: input.tagId } });
    if (!before || before.tenantId !== input.tenantId) return;

    await tx.tenantTag.delete({ where: { id: input.tagId } });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'tenant.tag_removed',
        tenantId: input.tenantId,
        before: {
          label: before.label,
          color: before.color,
        } as Prisma.InputJsonValue,
        after: Prisma.JsonNull,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  });
}
