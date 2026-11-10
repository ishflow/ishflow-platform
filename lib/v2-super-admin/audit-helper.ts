import { withBypass } from '@/platform/db/tenant-context';
import { Prisma, type PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface SaAuditEvent {
  actorClerkId: string;
  action: string;
  /** Set to null for platform-scoped events (e.g. user.soft_deleted that
   * removes memberships from every tenant). */
  tenantId: string | null;
  targetUserId?: string | null;
  before?: unknown;
  after?: unknown;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Write a row to platform_audit_log inside an existing transaction. Use this
 * from server actions that already opened a withBypass tx so the audit row is
 * committed atomically with the mutation it describes.
 */
export async function writeSaAudit(tx: Tx, event: SaAuditEvent): Promise<void> {
  const h = await headers();
  await tx.platformAuditLog.create({
    data: {
      actorClerkId: event.actorClerkId,
      action: event.action,
      tenantId: event.tenantId,
      targetUserId: event.targetUserId ?? null,
      before: toJsonInput(event.before),
      after: toJsonInput(event.after),
      ip: h.get('x-forwarded-for') ?? null,
      userAgent: h.get('user-agent') ?? null,
    },
  });
}

/**
 * Standalone audit write — opens its own bypass tx. Use when the caller has
 * no transaction of its own (rare; prefer the in-tx form above).
 */
export async function writeSaAuditStandalone(event: SaAuditEvent): Promise<void> {
  await withBypass((tx) => writeSaAudit(tx, event));
}
